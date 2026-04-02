/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';
import type { DatasetSplit } from '../types';

/**
 * Assigns examples to named splits based on a deterministic hash of the example ID.
 *
 * @param examples - Array of examples with id fields
 * @param splitConfig - Map of split name → fraction (must sum to 1.0)
 * @returns Map of split name → example arrays
 */
export const assignSplits = <T extends Example>(
  examples: T[],
  splitConfig: Record<string, number>
): Record<string, T[]> => {
  const splits: Record<string, T[]> = {};
  for (const name of Object.keys(splitConfig)) {
    splits[name] = [];
  }

  // Build cumulative thresholds
  const entries = Object.entries(splitConfig);
  const thresholds: Array<[string, number]> = [];
  let cumulative = 0;
  for (const [name, fraction] of entries) {
    cumulative += fraction;
    thresholds.push([name, cumulative]);
  }

  for (const example of examples) {
    // Deterministic hash of example ID
    const hash = simpleHash(example.id ?? JSON.stringify(example.input));
    const bucket = Math.abs(hash) / 2147483647; // normalize to [0, 1)

    const splitName =
      thresholds.find(([, threshold]) => bucket < threshold)?.[0] ?? entries[entries.length - 1][0];
    splits[splitName].push(example);
  }

  return splits;
};

/**
 * Computes split statistics from an already-split dataset.
 */
export const computeSplitStats = (splits: Record<string, unknown[]>): DatasetSplit[] => {
  return Object.entries(splits).map(([name, examples]) => ({
    name,
    exampleCount: examples.length,
  }));
};

/**
 * Filters examples belonging to a specific split.
 */
export const filterBySplit = <T extends Example>(
  examples: T[],
  splitConfig: Record<string, number>,
  targetSplit: string
): T[] => {
  const allSplits = assignSplits(examples, splitConfig);
  return allSplits[targetSplit] ?? [];
};

/**
 * Simple non-cryptographic hash function.
 * Uses multiplication instead of bitwise shifts for eslint compatibility.
 */
const simpleHash = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = hash * 33 + str.charCodeAt(i);
    // Keep within safe integer range
    hash = hash % 2147483647;
  }
  return hash;
};
