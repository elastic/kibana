/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tokenBasedSplit, itemBasedSplit } from './split';
import { hierarchicalMerge } from './merge';
import type { BatchConfig, BatchResult } from './types';

/**
 * Process large input through LLM using batching and hierarchical merge
 *
 * @param config - Batch processing configuration
 * @returns Final merged output with statistics
 */
export async function batchProcess<TInput, TOutput>(
  config: BatchConfig<TInput, TOutput>
): Promise<BatchResult<TOutput>> {
  const startTime = Date.now();

  // Step 1: Split input into batches
  let batches: TInput[][];

  if (config.splitStrategy === 'token-based') {
    if (!config.maxTokensPerBatch || !config.tokenEstimator) {
      throw new Error('token-based strategy requires maxTokensPerBatch and tokenEstimator');
    }
    batches = tokenBasedSplit(config.input, config.maxTokensPerBatch, config.tokenEstimator);
  } else if (config.splitStrategy === 'item-based') {
    if (!config.maxItemsPerBatch) {
      throw new Error('item-based strategy requires maxItemsPerBatch');
    }
    batches = itemBasedSplit(config.input, config.maxItemsPerBatch);
  } else if (config.splitStrategy === 'custom') {
    if (!config.splitFn) {
      throw new Error('custom strategy requires splitFn');
    }
    batches = config.splitFn(config.input);
  } else {
    throw new Error(`Unknown split strategy: ${config.splitStrategy}`);
  }

  // Step 2: Process batches concurrently with backpressure (inline concurrency control)
  const maxConcurrent = config.maxConcurrentBatches ?? 3;
  const batchResults: TOutput[] = [];

  for (let i = 0; i < batches.length; i += maxConcurrent) {
    const chunk = batches.slice(i, i + maxConcurrent);

    const chunkResults = await Promise.all(
      chunk.map(async (batch, idx) => {
        const result = await config.processFn(batch);

        if (config.onProgress) {
          config.onProgress(i + idx + 1, batches.length);
        }

        return result;
      })
    );

    batchResults.push(...chunkResults);
  }

  // Step 3: Merge results hierarchically
  const finalOutput = await hierarchicalMerge(batchResults, config.mergeFn);
  const mergeRounds = Math.ceil(Math.log2(batchResults.length));

  const endTime = Date.now();

  return {
    output: finalOutput,
    stats: {
      batches: batches.length,
      mergeRounds,
      durationMs: endTime - startTime,
      tokensProcessed: 0, // Populated by caller if available
    },
  };
}
