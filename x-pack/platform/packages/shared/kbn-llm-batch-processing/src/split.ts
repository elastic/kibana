/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Split items into batches based on token count
 *
 * @param items - Items to split
 * @param maxTokensPerBatch - Maximum tokens per batch
 * @param tokenEstimator - Function to estimate tokens for an item
 * @returns Array of batches
 */
export function tokenBasedSplit<T>(
  items: T[],
  maxTokensPerBatch: number,
  tokenEstimator: (item: T) => number
): T[][] {
  if (items.length === 0) {
    return [];
  }

  const batches: T[][] = [];
  let currentBatch: T[] = [];
  let currentTokens = 0;

  for (const item of items) {
    const itemTokens = tokenEstimator(item);

    if (currentTokens + itemTokens > maxTokensPerBatch && currentBatch.length > 0) {
      // Current batch would exceed limit, flush it
      batches.push(currentBatch);
      currentBatch = [item];
      currentTokens = itemTokens;
    } else {
      // Add to current batch
      currentBatch.push(item);
      currentTokens += itemTokens;
    }
  }

  // Flush remaining batch
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Split items into batches based on fixed item count
 *
 * @param items - Items to split
 * @param maxItemsPerBatch - Maximum items per batch
 * @returns Array of batches
 */
export function itemBasedSplit<T>(items: T[], maxItemsPerBatch: number): T[][] {
  if (items.length === 0) {
    return [];
  }

  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += maxItemsPerBatch) {
    batches.push(items.slice(i, i + maxItemsPerBatch));
  }
  return batches;
}
