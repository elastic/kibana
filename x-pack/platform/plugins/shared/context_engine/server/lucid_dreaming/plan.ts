/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The batches ready to dream on, and the last item they hold: where the cursor moves to. */
export interface LucidBatchPlan<T> {
  batches: T[][];
  last?: T;
}

/**
 * Splits new items, oldest first, into batches of `batchSize`. A last batch that is not full
 * waits until its oldest item is `maxWaitMs` old, so a burst can fill it first.
 */
export const planLucidBatches = <T>(
  items: readonly T[],
  {
    batchSize,
    maxWaitMs,
    now,
    timeOf,
  }: { batchSize: number; maxWaitMs: number; now: number; timeOf: (item: T) => string }
): LucidBatchPlan<T> => {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += batchSize) {
    batches.push(items.slice(start, start + batchSize));
  }
  const partial = batches[batches.length - 1];
  if (partial && partial.length < batchSize && now - Date.parse(timeOf(partial[0])) < maxWaitMs) {
    batches.pop();
  }
  const lastBatch = batches[batches.length - 1];
  return lastBatch ? { batches, last: lastBatch[lastBatch.length - 1] } : { batches };
};
