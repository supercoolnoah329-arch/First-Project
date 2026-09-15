import * as THREE from 'https://esm.sh/three@0.161.0';

const root = document.querySelector('#game-root');
const scoreText = document.querySelector('#score');
const bestText = document.querySelector('#best');
const intro = document.querySelector('#message');
const complete = document.querySelector('#complete');
const completeCopy = document.querySelector('#complete-copy');
const startButton = document.querySelector('#start-button');
const againButton = document.querySelector('#again-button');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x84cbd0);
scene.fog = new THREE.Fog(0x84cbd0, 34, 90);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 150);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe7ffff, 0x3d6970, 2.5));
const sun = new THREE.DirectionalLight(0xfff0c2, 3.8);
sun.position.set(-12, 24, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); scene.add(sun);

const materials = {
  grass: new THREE.MeshStandardMaterial({ color: 0x57a675, roughness: .92 }),
  dirt: new THREE.MeshStandardMaterial({ color: 0x8c6448, roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xb7d5c3, roughness: .85 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x7a4d00, emissiveIntensity: .45, metalness: .4, roughness: .28 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xf0a477, roughness: .7 }),
  red: new THREE.MeshStandardMaterial({ color: 0xe95f4f, roughness: .6 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x315d9a, roughness: .7 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf8f3e7, roughness: .75 }),
  boot: new THREE.MeshStandardMaterial({ color: 0x704735, roughness: .85 }),
  dark: new THREE.MeshBasicMaterial({ color: 0x142936 }),
  mushroomBrown: new THREE.MeshStandardMaterial({ color: 0x8a4f35, roughness: .9 }),
  mushroomLight: new THREE.MeshStandardMaterial({ color: 0xe5c19b, roughness: .85 })
};
const platforms = [];
const feathers = [];
const enemies = [];
const keys = {};
let audioContext;
let player;
let goal;
let active = false;
let finished = false;
let featherCount = 0;
let best = Number(localStorage.getItem('skybound-3d-best') || 0);
bestText.textContent = String(best).padStart(2, '0');

function addPlatform(x, y, z, width, depth, accent = false) {
  const group = new THREE.Group(); group.position.set(x, y, z);
  const top = new THREE.Mesh(new THREE.BoxGeometry(width, .8, depth), materials.grass); top.position.y = .4; top.receiveShadow = true; top.castShadow = true; group.add(top);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(width, depth) * .34, Math.max(width, depth) * .54, 3.5, 7), materials.dirt); base.position.y = -1.6; base.receiveShadow = true; group.add(base);
  if (accent) { const flower = new THREE.Mesh(new THREE.ConeGeometry(.35, 1.3, 6), materials.gold); flower.position.set(width * .24, 1.15, depth * -.2); flower.castShadow = true; group.add(flower); }
  scene.add(group); platforms.push({ x, y: y + .8, z, width, depth });
}

function addFeather(x, y, z) {
  const group = new THREE.Group(); group.position.set(x, y, z);
  const stem = new THREE.Mesh(new THREE.CapsuleGeometry(.055, .65, 3, 8), materials.gold); stem.rotation.z = -.4; group.add(stem);
  const vane = new THREE.Mesh(new THREE.SphereGeometry(.23, 12, 8), materials.gold); vane.scale.set(.35, 1.3, .16); vane.position.set(.13, .25, 0); group.add(vane);
  group.userData.baseY = y; scene.add(group); feathers.push(group);
}

function addMushroom(x, y, z, patrol = 2) {
  const enemy = new THREE.Group(); enemy.position.set(x, y, z);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.27, .36, .72, 12), materials.mushroomLight); stem.position.y = .36; stem.castShadow = true; enemy.add(stem);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.65, 16, 10, 0, Math.PI * 2, 0, Math.PI * .52), materials.mushroomBrown); cap.scale.set(1.05, .75, 1.05); cap.position.y = .75; cap.castShadow = true; enemy.add(cap);
  [-.28, .25].forEach((side) => { const spot = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), materials.mushroomLight); spot.position.set(side, .98, -.42); spot.scale.z = .35; enemy.add(spot); });
  enemy.userData.startX = x; enemy.userData.patrol = patrol; enemy.userData.baseY = y; enemy.userData.phase = Math.random() * Math.PI * 2; scene.add(enemy); enemies.push(enemy);
}

function buildWorld() {
  addPlatform(0, 0, 0, 12, 10, true); addPlatform(-11, 2.7, -5, 6, 5); addPlatform(-19, 5.3, -11, 5, 5, true); addPlatform(-9, 7.8, -17, 6, 5); addPlatform(2, 10.3, -23, 7, 5, true); addPlatform(13, 12.8, -18, 5, 5); addPlatform(20, 15.3, -11, 8, 6, true);
  addFeather(-2, 2, -1); addFeather(-11, 5, -5); addFeather(-19, 7.6, -11); addFeather(-9, 10.1, -17); addFeather(2, 12.6, -23); addFeather(13, 15.1, -18); addFeather(20, 17.6, -11); addFeather(23, 19.8, -11);
  addMushroom(3, .8, 1, 2.5); addMushroom(-11, 3.5, -5, 1.7);
  const perch = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, 3.2, 12), materials.gold); perch.position.set(20, 19, -11); perch.rotation.z = Math.PI / 2; perch.castShadow = true; scene.add(perch);
  goal = new THREE.Mesh(new THREE.TorusGeometry(1.25, .08, 10, 32), materials.gold); goal.position.set(20, 20.1, -11); goal.rotation.x = Math.PI / 2; goal.castShadow = true; scene.add(goal);
  const clouds = new THREE.Group();
  for (let i = 0; i < 24; i += 1) { const cloud = new THREE.Mesh(new THREE.SphereGeometry(1.2 + Math.random() * 1.6, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .18 })); cloud.position.set((Math.random() - .5) * 70, 5 + Math.random() * 18, -10 - Math.random() * 45); cloud.scale.y = .35; clouds.add(cloud); }
  scene.add(clouds);
}

function buildPlayer() {
  player = new THREE.Group();
  const arms = [];
  const legs = [];
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.42, .6, 6, 12), materials.blue); torso.position.y = -.02; torso.castShadow = true; player.add(torso);
  const shirt = new THREE.Mesh(new THREE.SphereGeometry(.46, 16, 12), materials.red); shirt.scale.set(1, .62, .85); shirt.position.y = .3; shirt.castShadow = true; player.add(shirt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.51, 16, 12), materials.skin); head.position.set(0, .92, -.05); head.castShadow = true; player.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.57, 16, 10, 0, Math.PI * 2, 0, Math.PI * .58), materials.red); cap.scale.set(1.05, .72, 1.02); cap.position.set(0, 1.25, -.08); cap.castShadow = true; player.add(cap);
  const brim = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 6), materials.red); brim.scale.set(1.5, .22, .75); brim.position.set(0, 1.18, -.48); brim.castShadow = true; player.add(brim);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 8), materials.skin); nose.scale.set(1, .85, 1.2); nose.position.set(0, .86, -.5); player.add(nose);
  [-.2, .2].forEach((side) => { const eye = new THREE.Mesh(new THREE.SphereGeometry(.065, 8, 8), materials.dark); eye.position.set(side, 1.04, -.47); player.add(eye); });
  [-.3, .3].forEach((side) => { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .42, 5, 8), materials.red); arm.position.set(side, .18, 0); arm.rotation.z = side * -.3; arm.castShadow = true; player.add(arm); arms.push(arm); const glove = new THREE.Mesh(new THREE.SphereGeometry(.17, 10, 8), materials.white); glove.position.set(side * 1.02, -.08, 0); glove.castShadow = true; player.add(glove); });
  [-.23, .23].forEach((side) => { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .34, 5, 8), materials.blue); leg.position.set(side, -.68, 0); leg.castShadow = true; player.add(leg); legs.push(leg); const boot = new THREE.Mesh(new THREE.SphereGeometry(.25, 10, 8), materials.boot); boot.scale.set(1.2, .7, 1.45); boot.position.set(side, -.83, -.14); boot.castShadow = true; player.add(boot); });
  player.userData.animation = { arms, legs, walkTime: 0 };
  player.position.set(0, 2.1, 1); scene.add(player);
}

function resetGame() { featherCount = 0; scoreText.textContent = '00 / 08'; finished = false; active = true; intro.classList.add('is-hidden'); complete.classList.add('is-hidden'); player.position.set(0, 2.1, 1); player.userData.velocityY = 0; player.userData.grounded = false; player.userData.jumpCount = 0; feathers.forEach((feather) => { feather.visible = true; }); }
function playJumpSound() {
  audioContext ||= new AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(330, now);
  oscillator.frequency.exponentialRampToValueAtTime(660, now + .12);
  gain.gain.setValueAtTime(.0001, now);
  gain.gain.exponentialRampToValueAtTime(.12, now + .015);
  gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
  oscillator.connect(gain); gain.connect(audioContext.destination);
  oscillator.start(now); oscillator.stop(now + .17);
}
function jump() {
  if (!active || player.userData.jumpCount >= 2) return;
  player.userData.velocityY = 8.8;
  player.userData.grounded = false;
  player.userData.jumpCount += 1;
  playJumpSound();
}
function collectFeathers() { feathers.forEach((feather) => { if (feather.visible && player.position.distanceTo(feather.position) < 1.15) { feather.visible = false; featherCount += 1; scoreText.textContent = `${String(featherCount).padStart(2, '0')} / 08`; } }); }
function checkGoal() { if (featherCount === feathers.length && player.position.distanceTo(goal.position) < 2.1) win(); }
function checkEnemies() { if (enemies.some((enemy) => player.position.distanceTo(enemy.position) < 1.15)) { player.position.set(0, 3, 1); player.userData.velocityY = 0; player.userData.jumpCount = 0; } }
function win() { finished = true; active = false; best = Math.max(best, featherCount); localStorage.setItem('skybound-3d-best', best); bestText.textContent = String(best).padStart(2, '0'); completeCopy.textContent = `You gathered all ${feathers.length} feathers and reached the golden perch.`; complete.classList.remove('is-hidden'); }

function update(delta, time) {
  feathers.forEach((feather, index) => { if (feather.visible) { feather.rotation.y += delta * 2; feather.position.y = feather.userData.baseY + Math.sin(time * .003 + index) * .18; } });
  if (goal) { goal.rotation.z += delta * 1.5; goal.position.y = 20.1 + Math.sin(time * .003) * .15; }
  enemies.forEach((enemy) => { enemy.position.x = enemy.userData.startX + Math.sin(time * .0012 + enemy.userData.phase) * enemy.userData.patrol; enemy.position.y = enemy.userData.baseY + Math.abs(Math.sin(time * .004 + enemy.userData.phase)) * .08; enemy.rotation.y += delta * .8; });
  if (!active) return;
  const direction = new THREE.Vector3((keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0), 0, (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0));
  const isMoving = direction.lengthSq() > 0;
  if (isMoving) {
    direction.normalize(); player.position.x += direction.x * 7 * delta; player.position.z += direction.z * 7 * delta; player.rotation.y = Math.atan2(direction.x, direction.z);
    player.userData.animation.walkTime += delta * 11;
  }
  const walkAmount = isMoving ? Math.sin(player.userData.animation.walkTime) * .65 : 0;
  player.userData.animation.arms.forEach((arm, index) => { arm.rotation.x = index === 0 ? walkAmount : -walkAmount; });
  player.userData.animation.legs.forEach((leg, index) => { leg.rotation.x = index === 0 ? -walkAmount : walkAmount; });
  player.userData.velocityY -= 22 * delta;
  const previousY = player.position.y;
  player.position.y += player.userData.velocityY * delta;
  player.userData.grounded = false;
  const previousFeet = previousY - .7;
  const currentFeet = player.position.y - .7;
  const landingTolerance = Math.max(.18, Math.abs(player.userData.velocityY * delta) + .08);
  platforms.forEach((platform) => {
    const within = Math.abs(player.position.x - platform.x) < platform.width / 2 + .55 && Math.abs(player.position.z - platform.z) < platform.depth / 2 + .55;
    const crossingTop = previousFeet >= platform.y - landingTolerance && currentFeet <= platform.y + landingTolerance;
    if (within && player.userData.velocityY <= 0 && crossingTop) {
      player.position.y = platform.y + .7;
      player.userData.velocityY = 0;
      player.userData.grounded = true;
      player.userData.jumpCount = 0;
    }
  });
  if (player.position.y < -8) {
    player.position.set(0, 3, 1);
    player.userData.velocityY = 0;
    player.userData.jumpCount = 0;
  }
  collectFeathers();
  checkEnemies();
  checkGoal();
  const target = new THREE.Vector3(player.position.x, player.position.y + 4.2, player.position.z + 10); camera.position.lerp(target, 1 - Math.pow(.001, delta)); camera.lookAt(player.position.x, player.position.y + .3, player.position.z - 4);
}

function animate(time = 0) { requestAnimationFrame(animate); const delta = Math.min((time - (animate.last || time)) / 1000, .04); animate.last = time; update(delta, time); renderer.render(scene, camera); }

window.addEventListener('keydown', (event) => { keys[event.code] = true; if (event.code === 'Space') { event.preventDefault(); jump(); } });
window.addEventListener('keyup', (event) => { keys[event.code] = false; });
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
startButton.addEventListener('click', resetGame); againButton.addEventListener('click', resetGame);
document.querySelectorAll('.touch-controls button').forEach((button) => { button.addEventListener('pointerdown', () => { if (button.dataset.key === 'Space') jump(); else keys[button.dataset.key] = true; }); button.addEventListener('pointerup', () => { keys[button.dataset.key] = false; }); button.addEventListener('pointerleave', () => { keys[button.dataset.key] = false; }); });

buildWorld(); buildPlayer(); camera.position.set(0, 8, 13); camera.lookAt(0, 2, 0); animate();
