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
  return retrievedDocs.filter((doc) => isRelevant(doc, groundTruth, threshold));
}

export function dedupeDocs(docs: RetrievedDoc[]): RetrievedDoc[] {
  const seen = new Set<string>();
  return docs.filter((doc) => {
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

/**
 * HitRate@K (also known as Accuracy@K) = 1 if at least one relevant doc is in the top K, else 0
 */
export function calculateHitRate(hits: number): number {
  return hits > 0 ? 1 : 0;
}

/**
 * MRR@K = 1 / (1-indexed rank of the first relevant doc in the top K), or 0 if none
 * Measures how early the first useful result appears in the ranking.
 */
export function calculateMrr(relevantFlags: boolean[]): number {
  const firstRelevantIndex = relevantFlags.indexOf(true);
  return firstRelevantIndex === -1 ? 0 : 1 / (firstRelevantIndex + 1);
}

/**
 * Relevance gain of a retrieved doc for NDCG: the graded ground-truth score when it meets
 * the threshold, otherwise 0.
 */
export function getRelevanceGain(
  doc: RetrievedDoc,
  groundTruth: GroundTruth,
  threshold: number
): number {
  const score = groundTruth[doc.index]?.[doc.id];
  return score !== undefined && score >= threshold ? score : 0;
}

/**
 * Ideal gains for NDCG: all ground-truth grades meeting the threshold, sorted descending,
 * capped at K (the best possible ranking of the top K results).
 */
export function getIdealGains(groundTruth: GroundTruth, threshold: number, k: number): number[] {
  return Object.values(groundTruth)
    .flatMap((indexDocs) => Object.values(indexDocs))
    .filter((score) => score >= threshold)
    .sort((a, b) => b - a)
    .slice(0, k);
}

/**
 * DCG = Σ gain_i / log2(i + 2), i 0-indexed
 */
function calculateDcg(gains: number[]): number {
  return gains.reduce((sum, gain, i) => sum + gain / Math.log2(i + 2), 0);
}

/**
 * NDCG@K = DCG(top-K gains) / DCG(ideal gains), using graded relevance (ground-truth
 * scores as gains). Returns 0 when the ideal DCG is 0.
 */
export function calculateNdcg(gains: number[], idealGains: number[]): number {
  const idealDcg = calculateDcg(idealGains);
  if (idealDcg <= 0) {
    return 0;
  }
  return calculateDcg(gains) / idealDcg;
}

/**
 * MAP@K (average precision per query) = Σ over relevant hits at 1-indexed rank r of
 * (relevant docs seen so far / r), divided by min(K, total relevant docs in ground truth)
 */
export function calculateMap(relevantFlags: boolean[], k: number, totalRelevant: number): number {
  const denominator = Math.min(k, totalRelevant);
  if (denominator <= 0) {
    return 0;
  }
  let numCorrect = 0;
  let sumPrecisions = 0;
  relevantFlags.forEach((relevant, i) => {
    if (relevant) {
      numCorrect++;
      sumPrecisions += numCorrect / (i + 1);
    }
  });
  return sumPrecisions / denominator;
}
