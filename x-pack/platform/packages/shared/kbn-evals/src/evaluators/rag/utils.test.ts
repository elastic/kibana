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
} from './utils';
import type { GroundTruth } from './types';

describe('RAG Utils', () => {
  describe('isRelevant', () => {
    const groundTruth: GroundTruth = { doc_a: 1, doc_b: 2, doc_c: 3 };

    it('should return true when doc score meets threshold', () => {
      expect(isRelevant('doc_a', groundTruth, 1)).toBe(true);
      expect(isRelevant('doc_b', groundTruth, 2)).toBe(true);
      expect(isRelevant('doc_c', groundTruth, 1)).toBe(true);
    });

    it('should return false when doc score is below threshold', () => {
      expect(isRelevant('doc_a', groundTruth, 2)).toBe(false);
      expect(isRelevant('doc_b', groundTruth, 3)).toBe(false);
    });

    it('should return false for unknown documents', () => {
      expect(isRelevant('unknown_doc', groundTruth, 1)).toBe(false);
    });

    it('should handle zero score correctly', () => {
      const gtWithZero: GroundTruth = { doc_zero: 0 };
      expect(isRelevant('doc_zero', gtWithZero, 0)).toBe(true);
      expect(isRelevant('doc_zero', gtWithZero, 1)).toBe(false);
    });
  });

  describe('getRelevantDocs', () => {
    const groundTruth: GroundTruth = { doc_a: 1, doc_b: 2, doc_c: 1 };

    it('should filter retrieved docs by relevance threshold', () => {
      const retrieved = ['doc_a', 'doc_b', 'doc_c', 'doc_d'];
      expect(getRelevantDocs(retrieved, groundTruth, 1)).toEqual(['doc_a', 'doc_b', 'doc_c']);
      expect(getRelevantDocs(retrieved, groundTruth, 2)).toEqual(['doc_b']);
    });

    it('should return empty array when no docs are relevant', () => {
      const retrieved = ['doc_X', 'doc_Y'];
      expect(getRelevantDocs(retrieved, groundTruth, 1)).toEqual([]);
    });

    it('should handle empty retrieved docs', () => {
      expect(getRelevantDocs([], groundTruth, 1)).toEqual([]);
    });
  });

  describe('countRelevantInGroundTruth', () => {
    it('should count documents meeting threshold', () => {
      const groundTruth: GroundTruth = { doc_a: 1, doc_b: 2, doc_c: 3, doc_d: 1 };
      expect(countRelevantInGroundTruth(groundTruth, 1)).toBe(4);
      expect(countRelevantInGroundTruth(groundTruth, 2)).toBe(2);
      expect(countRelevantInGroundTruth(groundTruth, 3)).toBe(1);
      expect(countRelevantInGroundTruth(groundTruth, 4)).toBe(0);
    });

    it('should handle empty ground truth', () => {
      expect(countRelevantInGroundTruth({}, 1)).toBe(0);
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
