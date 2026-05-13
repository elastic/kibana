/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a retrieved document with its index and ID.
 */
export interface RetrievedDoc {
  index: string;
  id: string;
}

/**
 * Ground truth mapping index names to document relevance scores.
 * Structure: { indexName: { docId: relevanceScore } }
 * Higher scores indicate more relevant documents.
 * Example: { "my-index": { "doc_A": 1, "doc_B": 2 }, "other-index": { "doc_C": 1 } }
 */
export type GroundTruth = Record<string, Record<string, number>>;

/**
 * Function to extract retrieved documents from task output.
 * Implement this based on your specific task output structure.
 */
export type RetrievedDocsExtractor<T = unknown> = (output: T) => RetrievedDoc[];

/**
 * Function to extract ground truth from the reference output (expected output).
 * Implement this based on your specific reference output structure.
 */
export type GroundTruthExtractor<T = unknown> = (referenceOutput: T) => GroundTruth;

export interface RagEvaluatorConfig<TOutput = unknown, TReferenceOutput = unknown> {
  /** Number of top results to evaluate (K in Precision@K, Recall@K). Can be a single value or array for multi-K evaluation */
  k: number | number[];
  /** Minimum score in ground truth to consider a document relevant. Default: 1 */
  relevanceThreshold?: number;
  /** Function to extract retrieved docs from task output */
  extractRetrievedDocs: RetrievedDocsExtractor<TOutput>;
  /** Function to extract ground truth from reference output (expected output) */
  extractGroundTruth: GroundTruthExtractor<TReferenceOutput>;
  /** Filter evaluation to only indices present in ground truth. Default: from env var INDEX_FOCUSED_RAG_EVAL */
  filterByGroundTruthIndices?: boolean;
}
