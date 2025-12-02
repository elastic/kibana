/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ground truth mapping document IDs to relevance scores.
 * Higher scores indicate more relevant documents.
 * Example: { "doc_A": 1, "doc_B": 2, "doc_C": 1 }
 */
export type GroundTruth = Record<string, number>;

/**
 * Function to extract retrieved document IDs from task output.
 * Implement this based on your specific task output structure.
 */
export type RetrievedDocsExtractor<T = unknown> = (output: T) => string[];

/**
 * Function to extract ground truth from example metadata.
 * Implement this based on your specific metadata structure.
 */
export type GroundTruthExtractor<T = unknown> = (metadata: T) => GroundTruth;

export interface RagEvaluatorConfig<TOutput = unknown, TMetadata = unknown> {
  /** Number of top results to evaluate (K in Precision@K, Recall@K) */
  k: number;
  /** Minimum score in ground truth to consider a document relevant. Default: 1 */
  relevanceThreshold?: number;
  /** Function to extract retrieved doc IDs from task output */
  extractRetrievedDocs: RetrievedDocsExtractor<TOutput>;
  /** Function to extract ground truth from example metadata */
  extractGroundTruth: GroundTruthExtractor<TMetadata>;
}
