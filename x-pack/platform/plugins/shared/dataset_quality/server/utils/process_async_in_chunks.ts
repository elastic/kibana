/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bytePartition } from '@kbn/std';
import { isEmpty, isPlainObject } from 'lodash';

type CallbackFn<TResult> = (chunk: string[], id: number) => Promise<TResult>;

type MergeableRecord = Record<string, unknown>;

// Copies the array and object spine of `source` into `target` once, so merging every chunk
// stays linear in the total response size and `target` never aliases a chunk's own arrays.
const mergeInto = (target: MergeableRecord, source: MergeableRecord): MergeableRecord => {
  for (const [key, sourceValue] of Object.entries(source)) {
    // Response JSON keeps `__proto__` keys, so they must never be merged into the result.
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    const targetValue = target[key];

    if (Array.isArray(sourceValue)) {
      if (Array.isArray(targetValue)) {
        for (const item of sourceValue) {
          targetValue.push(item);
        }
      } else {
        target[key] = [...sourceValue];
      }
    } else if (isPlainObject(sourceValue)) {
      target[key] = mergeInto(
        isPlainObject(targetValue) ? (targetValue as MergeableRecord) : {},
        sourceValue as MergeableRecord
      );
    } else {
      target[key] = sourceValue;
    }
  }

  return target;
};

/**
 * This process takes a list of strings (for this use case, we'll pass it a list of data streams), and does the following steps:
 * 1. Create chunks from the original list. Each chunk will contain as many items until their summed length hits the limit.
 * 2. Provide each chunk in parallel to the chunkExecutor callback and resolve the result, which for our use case performs HTTP requests for data stream stats.
 * 3. Deep merge the result of each response into one result: arrays are concatenated, objects are merged recursively and later chunks win for other values.
 * 4. Once all chunks are processed, return the merged result.
 */
export const processAsyncInChunks = async <TResult>(
  list: string[],
  chunkExecutor: CallbackFn<TResult>
): Promise<TResult> => {
  const chunks = bytePartition(list);

  if (isEmpty(chunks)) {
    return chunkExecutor([], 0);
  }

  const chunkResults = await Promise.all(chunks.map(chunkExecutor));

  const merged: MergeableRecord = {};
  for (const chunkResult of chunkResults) {
    mergeInto(merged, chunkResult as MergeableRecord);
  }

  return merged as TResult;
};
