/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MODULUS = 2147483647; // 2^31 - 1
const MULTIPLIER = 48271;

/**
 * Deterministic Park–Miller PRNG so the same sample always projects to the same layout.
 * Products stay below 2^53, so plain floating-point arithmetic is exact.
 */
export const createSeededRandom = (seed: number): (() => number) => {
  let state = (Math.abs(Math.round(seed)) % (MODULUS - 1)) + 1;
  return () => {
    state = (state * MULTIPLIER) % MODULUS;
    return (state - 1) / (MODULUS - 1);
  };
};
