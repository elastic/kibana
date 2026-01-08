/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LodSelection, LodTier } from './types';
import { LOD_THRESHOLDS, DEFAULT_SAMPLING_RATES, GPU_LIMITS } from './constants';

/**
 * Select the appropriate LOD tier based on data count
 * This runs in parallel with data fetching using _count API
 */
export function selectLodTier(
  dataPointCount: number,
  userOverride?: { tier: LodTier; samplingRate?: number }
): LodSelection {
  // User override takes precedence
  if (userOverride) {
    const samplingRate = userOverride.samplingRate ?? getSamplingRateForTier(userOverride.tier);
    return {
      tier: userOverride.tier,
      samplingRate,
      estimatedRenderPoints: Math.min(dataPointCount * samplingRate, GPU_LIMITS.MAX_RENDER_POINTS),
      reason: 'User selected LOD tier',
    };
  }

  // Tier 1: Full render
  if (dataPointCount <= LOD_THRESHOLDS.TIER_1_MAX) {
    return {
      tier: 1,
      samplingRate: 1.0,
      estimatedRenderPoints: dataPointCount,
      reason: `${dataPointCount.toLocaleString()} points - full resolution`,
    };
  }

  // Tier 2: Client-side decimation
  if (dataPointCount <= LOD_THRESHOLDS.TIER_2_MAX) {
    const samplingRate = GPU_LIMITS.TARGET_RENDER_POINTS / dataPointCount;
    return {
      tier: 2,
      samplingRate: Math.min(samplingRate, DEFAULT_SAMPLING_RATES.TIER_2),
      estimatedRenderPoints: Math.ceil(dataPointCount * samplingRate),
      reason: `${dataPointCount.toLocaleString()} points - client-side sampling`,
    };
  }

  // Tier 3: Server-side sampling
  if (dataPointCount <= LOD_THRESHOLDS.TIER_3_MAX) {
    const samplingRate = GPU_LIMITS.TARGET_RENDER_POINTS / dataPointCount;
    return {
      tier: 3,
      samplingRate: Math.max(samplingRate, DEFAULT_SAMPLING_RATES.TIER_3),
      estimatedRenderPoints: Math.ceil(dataPointCount * samplingRate),
      reason: `${dataPointCount.toLocaleString()} points - server-side sampling (random_sampler)`,
    };
  }

  // Tier 4: Tile-based progressive loading
  const samplingRate = GPU_LIMITS.TARGET_RENDER_POINTS / dataPointCount;
  return {
    tier: 4,
    samplingRate,
    estimatedRenderPoints: GPU_LIMITS.TARGET_RENDER_POINTS,
    reason: `${dataPointCount.toLocaleString()} points - tile-based progressive loading`,
  };
}

/**
 * Get default sampling rate for a given tier
 */
function getSamplingRateForTier(tier: LodTier): number {
  switch (tier) {
    case 1:
      return 1.0;
    case 2:
      return DEFAULT_SAMPLING_RATES.TIER_2;
    case 3:
      return DEFAULT_SAMPLING_RATES.TIER_3;
    case 4:
      return DEFAULT_SAMPLING_RATES.TIER_3; // Same as tier 3 per tile
    default:
      return 1.0;
  }
}

/**
 * Calculate sampling probability for ES random_sampler aggregation
 * Probability must be between 0 and 0.5 for random_sampler
 */
export function calculateServerSamplingProbability(
  estimatedCount: number,
  targetPoints: number = GPU_LIMITS.TARGET_RENDER_POINTS
): number {
  if (estimatedCount <= targetPoints) {
    return 1.0; // No sampling needed
  }

  const probability = targetPoints / estimatedCount;

  // random_sampler requires probability <= 0.5
  // If we need more than 50%, we'll get all data and decimate client-side
  return Math.min(probability, 0.5);
}

/**
 * Perform reservoir sampling for client-side decimation
 * This is done in a Web Worker for large datasets
 */
export function reservoirSample<T>(data: T[], sampleSize: number, seed?: number): T[] {
  if (data.length <= sampleSize) {
    return data;
  }

  const reservoir: T[] = new Array(sampleSize);
  const random = createSeededRandom(seed);

  // Fill reservoir with first k items
  for (let i = 0; i < sampleSize; i++) {
    reservoir[i] = data[i];
  }

  // Replace elements with decreasing probability
  for (let i = sampleSize; i < data.length; i++) {
    const j = Math.floor(random() * (i + 1));
    if (j < sampleSize) {
      reservoir[j] = data[i];
    }
  }

  return reservoir;
}

/**
 * Reservoir sampling for TypedArrays (more efficient for GPU data)
 */
export function reservoirSampleTypedArray(
  data: Float32Array,
  sampleSize: number,
  seed?: number
): Float32Array {
  if (data.length <= sampleSize) {
    return data;
  }

  const indices = reservoirSampleIndices(data.length, sampleSize, seed);
  const result = new Float32Array(sampleSize);

  for (let i = 0; i < sampleSize; i++) {
    result[i] = data[indices[i]];
  }

  return result;
}

/**
 * Get reservoir sample indices (useful when sampling multiple parallel arrays)
 */
export function reservoirSampleIndices(
  dataLength: number,
  sampleSize: number,
  seed?: number
): Uint32Array {
  const actualSampleSize = Math.min(sampleSize, dataLength);
  const indices = new Uint32Array(actualSampleSize);
  const random = createSeededRandom(seed);

  // Fill with first k indices
  for (let i = 0; i < actualSampleSize; i++) {
    indices[i] = i;
  }

  // Replace with decreasing probability
  for (let i = actualSampleSize; i < dataLength; i++) {
    const j = Math.floor(random() * (i + 1));
    if (j < actualSampleSize) {
      indices[j] = i;
    }
  }

  return indices;
}

/**
 * Create a seeded random number generator for reproducible sampling
 * Uses a simple linear congruential generator
 */
function createSeededRandom(seed?: number): () => number {
  let state = seed ?? Math.floor(Math.random() * 2147483647);
  const a = 1664525;
  const c = 1013904223;
  const m = Math.pow(2, 32);

  return function () {
    state = (a * state + c) % m;
    return state / m;
  };
}
