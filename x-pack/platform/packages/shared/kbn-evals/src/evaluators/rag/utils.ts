/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroundTruth } from './types';

export const DEFAULT_RELEVANCE_THRESHOLD = 1;

export function isRelevant(docId: string, groundTruth: GroundTruth, threshold: number): boolean {
  const score = groundTruth[docId];
  return score !== undefined && score >= threshold;
}

export function getRelevantDocs(
  retrievedDocs: string[],
  groundTruth: GroundTruth,
  threshold: number
): string[] {
  return retrievedDocs.filter((docId) => isRelevant(docId, groundTruth, threshold));
}

export function countRelevantInGroundTruth(groundTruth: GroundTruth, threshold: number): number {
  return Object.values(groundTruth).filter((score) => score >= threshold).length;
}

/**
 * Precision@K = (number of relevant docs in top K) / K
 * Measures noise: what fraction of retrieved docs are relevant
 */
export function calculatePrecision(hits: number, k: number): number {
  if (k <= 0) {
    return 0;
  }
  return hits / k;
}

/**
 * Recall@K = (number of relevant docs in top K) / (total relevant docs in ground truth)
 * Measures completeness: what fraction of relevant docs were retrieved
 */
export function calculateRecall(hits: number, totalRelevant: number): number {
  if (totalRelevant <= 0) {
    return 0;
  }
  return hits / totalRelevant;
}

/**
 * F1@K = harmonic mean of Precision@K and Recall@K
 * F1 = 2 * (precision * recall) / (precision + recall)
 */
export function calculateF1(precision: number, recall: number): number {
  if (precision + recall <= 0) {
    return 0;
  }
  return (2 * precision * recall) / (precision + recall);
}
