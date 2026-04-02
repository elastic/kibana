/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfidenceInterval } from '../types';

/**
 * Simple seeded pseudo-random number generator (linear congruential).
 * Used for reproducible bootstrap sampling.
 */
const createRng = (seed: number) => {
  let state = Math.abs(seed) % 2147483647 || 1;
  return () => {
    // Park-Miller LCG: avoids bitwise operators
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

/**
 * Computes a bootstrap confidence interval for the mean of a set of scores.
 *
 * @param scores - Array of numeric scores
 * @param level - Confidence level (e.g., 0.95 for 95% CI)
 * @param nBootstrap - Number of bootstrap iterations (default: 10000)
 * @param seed - Random seed for reproducibility (default: 42)
 */
export const computeConfidenceInterval = (
  scores: number[],
  level: number = 0.95,
  nBootstrap: number = 10000,
  seed: number = 42
): ConfidenceInterval => {
  if (scores.length === 0) {
    return { lower: 0, upper: 0, mean: 0, level };
  }

  if (scores.length === 1) {
    return { lower: scores[0], upper: scores[0], mean: scores[0], level };
  }

  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const rng = createRng(seed);

  // Bootstrap: resample with replacement and compute means
  const bootstrapMeans: number[] = [];
  for (let i = 0; i < nBootstrap; i++) {
    let sampleSum = 0;
    for (let j = 0; j < scores.length; j++) {
      const idx = Math.floor(rng() * scores.length);
      sampleSum += scores[idx];
    }
    bootstrapMeans.push(sampleSum / scores.length);
  }

  // Sort for percentile computation
  bootstrapMeans.sort((a, b) => a - b);

  const alpha = 1 - level;
  const lowerIdx = Math.floor((alpha / 2) * nBootstrap);
  const upperIdx = Math.floor((1 - alpha / 2) * nBootstrap) - 1;

  return {
    lower: bootstrapMeans[Math.max(0, lowerIdx)],
    upper: bootstrapMeans[Math.min(nBootstrap - 1, upperIdx)],
    mean,
    level,
  };
};
