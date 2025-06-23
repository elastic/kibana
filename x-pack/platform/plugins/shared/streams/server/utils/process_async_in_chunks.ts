/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepMerge from 'deepmerge';
import { bytePartition } from '@kbn/std';
import { isEmpty } from 'lodash';

type CallbackFn<TResult> = (chunk: string[], id: number) => Promise<TResult>;

/**
 * This process takes a list of strings (for this use case, we'll pass it a list of data streams), and does the following steps:
 * 1. Create chunks from the original list. Each chunk will contain as many items until their summed length hits the limit.
 * 2. Provide each chunk in parallel to the chunkExecutor callback and resolve the result, which for our use case performs HTTP requests for data stream stats.
 * 3. Deep merge the result of each response into the same data structure, which is defined by the first item in the list.
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

  return chunkResults.reduce((result, chunkResult) => deepMerge(result, chunkResult));
};
