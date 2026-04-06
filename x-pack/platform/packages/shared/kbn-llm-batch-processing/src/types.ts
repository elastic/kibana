/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Split strategy for batching input items
 */
export type SplitStrategy = 'token-based' | 'item-based' | 'custom';

/**
 * Merge strategy for combining batch outputs
 */
export type MergeStrategy = 'hierarchical' | 'custom';

/**
 * Configuration for batch LLM processing
 */
export interface BatchConfig<TInput, TOutput> {
  /** Input items to process */
  input: TInput[];

  /** Split strategy */
  splitStrategy: SplitStrategy;

  /** Max tokens per batch (for token-based splitting) */
  maxTokensPerBatch?: number;

  /** Max items per batch (for item-based splitting) */
  maxItemsPerBatch?: number;

  /** Custom split function (for custom splitting) */
  splitFn?: (items: TInput[]) => TInput[][];

  /** Process a single batch through LLM */
  processFn: (batch: TInput[]) => Promise<TOutput>;

  /** Merge two outputs (for hierarchical merge) */
  mergeFn: (outputs: [TOutput, TOutput]) => Promise<TOutput>;

  /** Max concurrent batches (default: 3) */
  maxConcurrentBatches?: number;

  /** Token estimator for adaptive splitting */
  tokenEstimator?: (item: TInput) => number;

  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Processing statistics
 */
export interface BatchStats {
  /** Number of batches processed */
  batches: number;

  /** Number of merge rounds */
  mergeRounds: number;

  /** Total duration (ms) */
  durationMs: number;

  /** Tokens processed (estimated) */
  tokensProcessed: number;
}

/**
 * Result of batch processing
 */
export interface BatchResult<TOutput> {
  /** Final merged output */
  output: TOutput;

  /** Processing statistics */
  stats: BatchStats;
}
