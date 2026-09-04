/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isRelevant,
  getRelevantDocs,
  countRelevantInGroundTruth,
  calculatePrecision,
  calculateRecall,
  calculateF1,
  calculateHitRate,
  calculateMrr,
  calculateNdcg,
  calculateMap,
  dedupeDocs,
  getRelevanceGain,
  getIdealGains,
  filterDocsByGroundTruthIndices,
} from './metrics';
import type { GroundTruth, RetrievedDoc } from './types';

describe('IR Utils', () => {
  describe('isRelevant', () => {
    const groundTruth: GroundTruth = {
      'index-a': { doc_a: 1, doc_b: 2, doc_c: 3 },
      'index-b': { doc_d: 1 },
    };

    it('should return true when doc score meets threshold', () => {
      expect(isRelevant({ index: 'index-a', id: 'doc_a' }, groundTruth, 1)).toBe(true);
      expect(isRelevant({ index: 'index-a', id: 'doc_b' }, groundTruth, 2)).toBe(true);
      expect(isRelevant({ index: 'index-a', id: 'doc_c' }, groundTruth, 1)).toBe(true);
      expect(isRelevant({ index: 'index-b', id: 'doc_d' }, groundTruth, 1)).toBe(true);
    });

    it('should return false when doc score is below threshold', () => {
      expect(isRelevant({ index: 'index-a', id: 'doc_a' }, groundTruth, 2)).toBe(false);
      expect(isRelevant({ index: 'index-a', id: 'doc_b' }, groundTruth, 3)).toBe(false);
    });

    it('should return false for unknown documents', () => {
      expect(isRelevant({ index: 'index-a', id: 'unknown_doc' }, groundTruth, 1)).toBe(false);
    });

    it('should return false for unknown indices', () => {
      expect(isRelevant({ index: 'unknown-index', id: 'doc_a' }, groundTruth, 1)).toBe(false);
    });
  });

  describe('getRelevantDocs', () => {
    const groundTruth: GroundTruth = {
      'index-a': { doc_a: 1, doc_b: 2, doc_c: 1 },
      'index-b': { doc_d: 1 },
    };

    it('should filter retrieved docs by relevance threshold', () => {
      const retrieved: RetrievedDoc[] = [
        { index: 'index-a', id: 'doc_a' },
        { index: 'index-a', id: 'doc_b' },
        { index: 'index-a', id: 'doc_c' },
        { index: 'index-a', id: 'doc_unknown' },
      ];
      expect(getRelevantDocs(retrieved, groundTruth, 1)).toEqual([
        { index: 'index-a', id: 'doc_a' },
        { index: 'index-a', id: 'doc_b' },
        { index: 'index-a', id: 'doc_c' },
      ]);
      expect(getRelevantDocs(retrieved, groundTruth, 2)).toEqual([
        { index: 'index-a', id: 'doc_b' },
      ]);
    });

    it('should return empty array when no docs are relevant', () => {
      const retrieved: RetrievedDoc[] = [
        { index: 'index-a', id: 'doc_X' },
        { index: 'index-a', id: 'doc_Y' },
      ];
      expect(getRelevantDocs(retrieved, groundTruth, 1)).toEqual([]);
    });

    it('should handle empty retrieved docs', () => {
      expect(getRelevantDocs([], groundTruth, 1)).toEqual([]);
    });

    it('should match docs across multiple indices', () => {
      const retrieved: RetrievedDoc[] = [
        { index: 'index-a', id: 'doc_a' },
        { index: 'index-b', id: 'doc_d' },
        { index: 'index-c', id: 'doc_e' },
      ];
      expect(getRelevantDocs(retrieved, groundTruth, 1)).toEqual([
        { index: 'index-a', id: 'doc_a' },
        { index: 'index-b', id: 'doc_d' },
      ]);
    });

    it('should not deduplicate docs (deduplication happens upfront via dedupeDocs)', () => {
      const retrieved: RetrievedDoc[] = [
        { index: 'index-a', id: 'doc_a' },
        { index: 'index-a', id: 'doc_a' }, // duplicate is preserved
        { index: 'index-a', id: 'doc_b' },
      ];
      expect(getRelevantDocs(retrieved, groundTruth, 1)).toEqual([
        { index: 'index-a', id: 'doc_a' },
        { index: 'index-a', id: 'doc_a' },
        { index: 'index-a', id: 'doc_b' },
      ]);
    });
  });

  describe('dedupeDocs', () => {
    it('should keep the first occurrence of each index:id pair', () => {
      const docs: RetrievedDoc[] = [
        { index: 'index-a', id: 'doc_a' },
        { index: 'index-a', id: 'doc_a' }, // duplicate
        { index: 'index-a', id: 'doc_b' },
        { index: 'index-a', id: 'doc_a' }, // another duplicate
        { index: 'index-b', id: 'doc_a' }, // same id, different index -> not a duplicate
        { index: 'index-b', id: 'doc_a' }, // duplicate
      ];
      expect(dedupeDocs(docs)).toEqual([
        { index: 'index-a', id: 'doc_a' },
        { index: 'index-a', id: 'doc_b' },
        { index: 'index-b', id: 'doc_a' },
      ]);
    });

    it('should handle empty input', () => {
      expect(dedupeDocs([])).toEqual([]);
    });

    it('should preserve order of first occurrences', () => {
      const docs: RetrievedDoc[] = [
        { index: 'index-a', id: 'doc_c' },
        { index: 'index-a', id: 'doc_a' },
        { index: 'index-a', id: 'doc_c' }, // duplicate of first
        { index: 'index-a', id: 'doc_b' },
      ];
      expect(dedupeDocs(docs)).toEqual([
        { index: 'index-a', id: 'doc_c' },
        { index: 'index-a', id: 'doc_a' },
        { index: 'index-a', id: 'doc_b' },
      ]);
    });
  });

  describe('getRelevanceGain', () => {
    const groundTruth: GroundTruth = {
      'index-a': { doc_a: 1, doc_b: 3 },
    };

    it('should return the ground truth score when it meets the threshold', () => {
      expect(getRelevanceGain({ index: 'index-a', id: 'doc_a' }, groundTruth, 1)).toBe(1);
      expect(getRelevanceGain({ index: 'index-a', id: 'doc_b' }, groundTruth, 1)).toBe(3);
      expect(getRelevanceGain({ index: 'index-a', id: 'doc_b' }, groundTruth, 3)).toBe(3);
    });

    it('should return 0 when the score is below the threshold', () => {
      expect(getRelevanceGain({ index: 'index-a', id: 'doc_a' }, groundTruth, 2)).toBe(0);
    });

    it('should return 0 for unknown documents or indices', () => {
      expect(getRelevanceGain({ index: 'index-a', id: 'doc_x' }, groundTruth, 1)).toBe(0);
      expect(getRelevanceGain({ index: 'index-x', id: 'doc_a' }, groundTruth, 1)).toBe(0);
    });
  });

  describe('getIdealGains', () => {
    const groundTruth: GroundTruth = {
      'index-a': { doc_a: 3, doc_b: 1 },
      'index-b': { doc_c: 2 },
    };

    it('should return grades meeting the threshold sorted descending, capped at k', () => {
      expect(getIdealGains(groundTruth, 1, 10)).toEqual([3, 2, 1]);
      expect(getIdealGains(groundTruth, 1, 2)).toEqual([3, 2]);
      expect(getIdealGains(groundTruth, 2, 10)).toEqual([3, 2]);
    });

    it('should return empty array when nothing meets the threshold', () => {
      expect(getIdealGains(groundTruth, 4, 10)).toEqual([]);
      expect(getIdealGains({}, 1, 10)).toEqual([]);
    });
  });

  describe('calculateHitRate', () => {
    it('should return 1 when there is at least one hit', () => {
      expect(calculateHitRate(1)).toBe(1);
      expect(calculateHitRate(5)).toBe(1);
    });

    it('should return 0 when there are no hits', () => {
      expect(calculateHitRate(0)).toBe(0);
    });
  });

  describe('calculateMrr', () => {
    it('should return 1 when the first result is relevant', () => {
      expect(calculateMrr([true, false, false])).toBe(1);
    });

    it('should return the reciprocal rank of the first relevant result', () => {
      expect(calculateMrr([false, true, false])).toBe(1 / 2);
      expect(calculateMrr([false, false, true])).toBeCloseTo(1 / 3);
    });

    it('should return 0 when no result is relevant', () => {
      expect(calculateMrr([false, false, false])).toBe(0);
      expect(calculateMrr([])).toBe(0);
    });
  });

  describe('calculateNdcg', () => {
    it('should return 1 for a perfect ranking', () => {
      expect(calculateNdcg([1, 1], [1, 1])).toBe(1);
      expect(calculateNdcg([3, 2, 1], [3, 2, 1])).toBe(1);
    });

    it('should penalize relevant docs appearing late (partial ranking, binary gains)', () => {
      // DCG = 1/log2(2) + 0/log2(3) + 1/log2(4) = 1.5
      // IDCG = 1/log2(2) + 1/log2(3) ≈ 1.63093
      expect(calculateNdcg([1, 0, 1], [1, 1])).toBeCloseTo(1.5 / (1 + 1 / Math.log2(3)), 5);
    });

    it('should return 0 when no relevant docs were retrieved', () => {
      expect(calculateNdcg([0, 0, 0], [1, 1])).toBe(0);
      expect(calculateNdcg([], [1, 1])).toBe(0);
    });

    it('should return 0 when the ideal ranking is empty (IDCG = 0)', () => {
      expect(calculateNdcg([0, 0], [])).toBe(0);
    });

    it('should use graded relevance (misordered grades score below 1)', () => {
      // Retrieved order has grades [1, 3, 2]; ideal order is [3, 2, 1].
      // DCG = 1/log2(2) + 3/log2(3) + 2/log2(4)
      // IDCG = 3/log2(2) + 2/log2(3) + 1/log2(4)
      const dcg = 1 + 3 / Math.log2(3) + 2 / 2;
      const idcg = 3 + 2 / Math.log2(3) + 1 / 2;
      expect(calculateNdcg([1, 3, 2], [3, 2, 1])).toBeCloseTo(dcg / idcg, 5);
    });
  });

  describe('calculateMap', () => {
    it('should return 1 when all relevant docs are ranked at the top', () => {
      expect(calculateMap([true, true, false], 3, 2)).toBe(1);
    });

    it('should average precision at each relevant hit (interleaved hits)', () => {
      // Hits at ranks 1, 3, 5: (1/1 + 2/3 + 3/5) / min(5, 3)
      expect(calculateMap([true, false, true, false, true], 5, 3)).toBeCloseTo(
        (1 + 2 / 3 + 3 / 5) / 3,
        5
      );
    });

    it('should return 0 when no relevant docs were retrieved', () => {
      expect(calculateMap([false, false], 2, 3)).toBe(0);
      expect(calculateMap([], 2, 3)).toBe(0);
    });

    it('should cap the denominator at k when there are more relevant docs than k', () => {
      // min(2, 10) = 2 -> perfect score achievable within top-2
      expect(calculateMap([true, true], 2, 10)).toBe(1);
    });

    it('should return 0 when there are no relevant docs in ground truth', () => {
      expect(calculateMap([false], 1, 0)).toBe(0);
    });
  });

  describe('countRelevantInGroundTruth', () => {
    it('should count documents meeting threshold across all indices', () => {
      const groundTruth: GroundTruth = {
        'index-a': { doc_a: 1, doc_b: 2, doc_c: 3 },
        'index-b': { doc_d: 1 },
      };
      expect(countRelevantInGroundTruth(groundTruth, 1)).toBe(4);
      expect(countRelevantInGroundTruth(groundTruth, 2)).toBe(2);
      expect(countRelevantInGroundTruth(groundTruth, 3)).toBe(1);
      expect(countRelevantInGroundTruth(groundTruth, 4)).toBe(0);
    });

    it('should handle empty ground truth', () => {
      expect(countRelevantInGroundTruth({}, 1)).toBe(0);
    });

    it('should handle empty indices', () => {
      const groundTruth: GroundTruth = { 'index-a': {} };
      expect(countRelevantInGroundTruth(groundTruth, 1)).toBe(0);
    });
  });

  describe('filterDocsByGroundTruthIndices', () => {
    const groundTruth: GroundTruth = {
      'index-a': { doc_a: 1 },
      'index-b': { doc_b: 1 },
    };

    it('should filter docs to only those in ground truth indices', () => {
      const docs: RetrievedDoc[] = [
        { index: 'index-a', id: 'doc_1' },
        { index: 'index-b', id: 'doc_2' },
        { index: 'index-c', id: 'doc_3' },
        { index: 'index-a', id: 'doc_4' },
      ];
      expect(filterDocsByGroundTruthIndices(docs, groundTruth)).toEqual([
        { index: 'index-a', id: 'doc_1' },
        { index: 'index-b', id: 'doc_2' },
        { index: 'index-a', id: 'doc_4' },
      ]);
    });

    it('should return empty array when no docs match ground truth indices', () => {
      const docs: RetrievedDoc[] = [
        { index: 'index-c', id: 'doc_1' },
        { index: 'index-d', id: 'doc_2' },
      ];
      expect(filterDocsByGroundTruthIndices(docs, groundTruth)).toEqual([]);
    });

    it('should handle empty docs array', () => {
      expect(filterDocsByGroundTruthIndices([], groundTruth)).toEqual([]);
    });

    it('should handle empty ground truth', () => {
      const docs: RetrievedDoc[] = [{ index: 'index-a', id: 'doc_1' }];
      expect(filterDocsByGroundTruthIndices(docs, {})).toEqual([]);
    });
  });

  describe('calculatePrecision', () => {
    it('should calculate precision correctly', () => {
      expect(calculatePrecision(3, 5)).toBe(0.6);
      expect(calculatePrecision(5, 5)).toBe(1);
      expect(calculatePrecision(0, 5)).toBe(0);
    });

    it('should handle zero K (division by zero)', () => {
      expect(calculatePrecision(0, 0)).toBe(0);
      expect(calculatePrecision(5, 0)).toBe(0);
    });

    it('should handle negative K', () => {
      expect(calculatePrecision(3, -1)).toBe(0);
    });
  });

  describe('calculateRecall', () => {
    it('should calculate recall correctly', () => {
      expect(calculateRecall(3, 10)).toBe(0.3);
      expect(calculateRecall(10, 10)).toBe(1);
      expect(calculateRecall(0, 10)).toBe(0);
    });

    it('should handle zero total relevant (division by zero)', () => {
      expect(calculateRecall(0, 0)).toBe(0);
      expect(calculateRecall(5, 0)).toBe(0);
    });

    it('should handle negative total relevant', () => {
      expect(calculateRecall(3, -1)).toBe(0);
    });
  });

  describe('calculateF1', () => {
    it('should calculate F1 score correctly', () => {
      // F1 = 2 * (0.6 * 0.3) / (0.6 + 0.3) = 0.4
      expect(calculateF1(0.6, 0.3)).toBeCloseTo(0.4);
      // Perfect precision and recall
      expect(calculateF1(1, 1)).toBe(1);
      // Zero precision
      expect(calculateF1(0, 0.5)).toBe(0);
      // Zero recall
      expect(calculateF1(0.5, 0)).toBe(0);
    });

    it('should handle both precision and recall being zero', () => {
      expect(calculateF1(0, 0)).toBe(0);
    });

    it('should handle edge case of very small values', () => {
      expect(calculateF1(0.001, 0.001)).toBeCloseTo(0.001);
    });
  });
});
