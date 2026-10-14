/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Tracks the RNG that every random-using helper reads from. Defaults to
// Math.random; installSeededRandom swaps it for a deterministic generator and
// returns a restore function.
let scriptRandom: () => number = Math.random;

// Returns a random number in [0, 1) using whichever RNG is currently
// installed. All script randomness goes through this so installSeededRandom
// can make runs reproducible.
export function rng(): number {
  return scriptRandom();
}

const MOD = 2 ** 32;

// Hashes a seed string into an integer using djb2-style multiply-and-add —
// pure integer arithmetic, no bitwise tricks.
function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33 + seed.charCodeAt(i)) % MOD;
  }
  return hash || 1;
}

// Linear Congruential Generator with the Numerical Recipes constants.
// Statistical quality is more than adequate for picking owners, severities,
// and tags in a load-generation script, and the math is one line.
function lcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % MOD;
    return state / MOD;
  };
}

// Replaces the script-wide RNG with a deterministic stream derived from
// `seed`, returning a function that restores the previous RNG. Used when
// --seed is supplied so a run produces the same plan, owner picks, severities,
// and tag selections every time.
export function installSeededRandom(seed: string): () => void {
  const previous = scriptRandom;
  scriptRandom = lcg(hashSeed(seed));
  return () => {
    scriptRandom = previous;
  };
}
