/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MODULUS = 2 ** 31;
const MULTIPLIER = 1103515245;
const INCREMENT = 12345;

/**
 * Tiny deterministic PRNG (linear congruential) seeded from a string, so fixture documents and
 * bootstrap resamples are identical on every machine and every run — a fixture that shifts
 * between rounds would silently move the reward.
 */
export const createRandom = (seed: string) => {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (state * 31 + seed.charCodeAt(i)) % MODULUS;
  }

  const next = (): number => {
    state = (MULTIPLIER * state + INCREMENT) % MODULUS;
    return state / MODULUS;
  };

  return {
    float: next,
    int: (max: number): number => Math.floor(next() * max),
    pick: <T>(values: readonly T[]): T => values[Math.floor(next() * values.length)],
  };
};
