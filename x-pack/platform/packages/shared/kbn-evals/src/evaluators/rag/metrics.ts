/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroundTruth, RetrievedDoc } from './types';

export const DEFAULT_RELEVANCE_THRESHOLD = 1;

export function isRelevant(
  doc: RetrievedDoc,
  groundTruth: GroundTruth,
  threshold: number
): boolean {
  const indexGroundTruth = groundTruth[doc.index];
  if (!indexGroundTruth) {
    return false;
  }
  const score = indexGroundTruth[doc.id];
  return score !== undefined && score >= threshold;
}

export function getRelevantDocs(
  retrievedDocs: RetrievedDoc[],
  groundTruth: GroundTruth,
  threshold: number
): RetrievedDoc[] {
  const seen = new Set<string>();
  return retrievedDocs.filter((doc) => {
    if (!isRelevant(doc, groundTruth, threshold)) {
      return false;
    }
    // Deduplicate by index:id to avoid counting the same relevant doc multiple times
    const key = `${doc.index}:${doc.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function countRelevantInGroundTruth(groundTruth: GroundTruth, threshold: number): number {
  let count = 0;
  for (const indexDocs of Object.values(groundTruth)) {
    count += Object.values(indexDocs).filter((score) => score >= threshold).length;
  }
  return count;
}

export function filterDocsByGroundTruthIndices(
  docs: RetrievedDoc[],
  groundTruth: GroundTruth
): RetrievedDoc[] {
  const indices = new Set(Object.keys(groundTruth));
  return docs.filter((doc) => indices.has(doc.index));
}

/**
 * Precision@K = (number of relevant docs in top K) / K
 * Measures noise: what fraction of retrieved docs are relevant
 * Note: When fewer than K docs are retrieved, we still divide by K (standard Precision@K behavior).
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
