/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Merge batch outputs hierarchically (tournament-style pairwise merge)
 *
 * @param outputs - Array of batch outputs to merge
 * @param mergeFn - Function to merge two outputs
 * @returns Final merged output
 *
 * @example
 * ```typescript
 * const batches = ['batch1', 'batch2', 'batch3', 'batch4'];
 * const result = await hierarchicalMerge(batches, async ([a, b]) => {
 *   return await llm.summarize([a, b]);
 * });
 * ```
 */
export async function hierarchicalMerge<T>(
  outputs: T[],
  mergeFn: (pair: [T, T]) => Promise<T>
): Promise<T> {
  if (outputs.length === 0) {
    throw new Error('Cannot merge empty array');
  }

  if (outputs.length === 1) {
    return outputs[0];
  }

  let current = outputs;

  while (current.length > 1) {
    const nextRound: T[] = [];

    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 < current.length) {
        // Merge pair
        const merged = await mergeFn([current[i], current[i + 1]]);
        nextRound.push(merged);
      } else {
        // Odd one out, pass through to next round
        nextRound.push(current[i]);
      }
    }

    current = nextRound;
  }

  return current[0];
}
