/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns a deterministic pseudo-random float in [0, 1) given an integer seed.
 * Uses a Park-Miller LCG to avoid bitwise operators.
 */
export const seededRandom = (seed: number): number => {
  // Park-Miller LCG: x_{n+1} = (a * x_n) mod m
  // a = 16807, m = 2147483647 (Mersenne prime)
  const a = 16807;
  const m = 2147483647;
  const s = (((Math.abs(seed) % (m - 1)) + 1) * a) % m;
  return (s - 1) / (m - 1);
};

/**
 * Hash a string to an integer using djb2-style polynomial rolling hash (no bitwise ops).
 */
export const hashString = (str: string): number => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = h * 33 + str.charCodeAt(i);
    // Keep in safe integer range using modulo
    h = h % 2147483647;
  }
  return Math.abs(h);
};

/**
 * Returns a noisy rate: baseRate * (0.8 + 0.4 * sin(bucketTime * phase))
 * bucketTime = Math.floor(Date.now() / 5000) — changes every 5 seconds.
 * Deterministic: same id + same bucketTime → same result.
 */
export const noisyRate = (baseRate: number, id: string, bucketTime: number): number => {
  const phase = seededRandom(hashString(id)) * Math.PI * 2;
  const sinVal = Math.sin(bucketTime * 0.3 + phase);
  return baseRate * (0.8 + 0.4 * ((sinVal + 1) / 2)); // maps sin [-1,1] → multiplier [0.8, 1.2]
};

/**
 * Returns a health status, seeded so it's stable within a 5s bucket.
 * ~88% healthy, ~10% degraded, ~2% down.
 */
export const seededHealth = (id: string, bucketTime: number): 'healthy' | 'degraded' | 'down' => {
  const combined = hashString(`${id}:${bucketTime}`);
  const r = seededRandom(combined);
  if (r < 0.02) return 'down';
  if (r < 0.12) return 'degraded';
  return 'healthy';
};
