import type { GroundTruth, RetrievedDoc } from './types';
export declare const DEFAULT_RELEVANCE_THRESHOLD = 1;
export declare function isRelevant(doc: RetrievedDoc, groundTruth: GroundTruth, threshold: number): boolean;
export declare function getRelevantDocs(retrievedDocs: RetrievedDoc[], groundTruth: GroundTruth, threshold: number): RetrievedDoc[];
export declare function countRelevantInGroundTruth(groundTruth: GroundTruth, threshold: number): number;
export declare function filterDocsByGroundTruthIndices(docs: RetrievedDoc[], groundTruth: GroundTruth): RetrievedDoc[];
/**
 * Precision@K = (number of relevant docs in top K) / K
 * Measures noise: what fraction of retrieved docs are relevant
 * Note: When fewer than K docs are retrieved, we still divide by K (standard Precision@K behavior).
 */
export declare function calculatePrecision(hits: number, k: number): number;
/**
 * Recall@K = (number of relevant docs in top K) / (total relevant docs in ground truth)
 * Measures completeness: what fraction of relevant docs were retrieved
 */
export declare function calculateRecall(hits: number, totalRelevant: number): number;
/**
 * F1@K = harmonic mean of Precision@K and Recall@K
 * F1 = 2 * (precision * recall) / (precision + recall)
 */
export declare function calculateF1(precision: number, recall: number): number;
