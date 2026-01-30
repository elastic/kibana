/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isKSpecificRagEvaluator,
  isRagMetricPattern,
  matchesEvaluatorPattern,
  findMatchingEvaluators,
  expandPatternsToEvaluators,
  RAG_METRIC_PATTERNS,
  RAG_METRIC_PREFIXES,
} from './patterns';

describe('evaluator patterns', () => {
  describe('RAG_METRIC_PATTERNS', () => {
    it('should contain the expected patterns', () => {
      expect(RAG_METRIC_PATTERNS).toEqual(['Precision@K', 'Recall@K', 'F1@K']);
    });
  });

  describe('RAG_METRIC_PREFIXES', () => {
    it('should contain the expected prefixes', () => {
      expect(RAG_METRIC_PREFIXES).toEqual(['Precision@', 'Recall@', 'F1@']);
    });
  });

  describe('isKSpecificRagEvaluator', () => {
    it('should return true for K-specific evaluator names', () => {
      expect(isKSpecificRagEvaluator('Precision@5')).toBe(true);
      expect(isKSpecificRagEvaluator('Precision@10')).toBe(true);
      expect(isKSpecificRagEvaluator('Precision@20')).toBe(true);
      expect(isKSpecificRagEvaluator('Recall@5')).toBe(true);
      expect(isKSpecificRagEvaluator('Recall@100')).toBe(true);
      expect(isKSpecificRagEvaluator('F1@10')).toBe(true);
    });

    it('should return false for pattern names', () => {
      expect(isKSpecificRagEvaluator('Precision@K')).toBe(false);
      expect(isKSpecificRagEvaluator('Recall@K')).toBe(false);
      expect(isKSpecificRagEvaluator('F1@K')).toBe(false);
    });

    it('should return false for non-RAG evaluators', () => {
      expect(isKSpecificRagEvaluator('Factuality')).toBe(false);
      expect(isKSpecificRagEvaluator('Relevance')).toBe(false);
      expect(isKSpecificRagEvaluator('Latency')).toBe(false);
    });

    it('should return false for invalid suffixes', () => {
      expect(isKSpecificRagEvaluator('Precision@abc')).toBe(false);
      expect(isKSpecificRagEvaluator('Precision@')).toBe(false);
      expect(isKSpecificRagEvaluator('Precision@10a')).toBe(false);
    });
  });

  describe('isRagMetricPattern', () => {
    it('should return true for RAG metric patterns', () => {
      expect(isRagMetricPattern('Precision@K')).toBe(true);
      expect(isRagMetricPattern('Recall@K')).toBe(true);
      expect(isRagMetricPattern('F1@K')).toBe(true);
    });

    it('should return false for K-specific names', () => {
      expect(isRagMetricPattern('Precision@10')).toBe(false);
      expect(isRagMetricPattern('Recall@5')).toBe(false);
    });

    it('should return false for non-RAG evaluators', () => {
      expect(isRagMetricPattern('Factuality')).toBe(false);
      expect(isRagMetricPattern('Relevance')).toBe(false);
    });
  });

  describe('matchesEvaluatorPattern', () => {
    describe('exact matching', () => {
      it('should match exact names', () => {
        expect(matchesEvaluatorPattern('Factuality', 'Factuality')).toBe(true);
        expect(matchesEvaluatorPattern('Relevance', 'Relevance')).toBe(true);
      });

      it('should not match different names', () => {
        expect(matchesEvaluatorPattern('Factuality', 'Relevance')).toBe(false);
      });
    });

    describe('pattern matching', () => {
      it('should match K-specific evaluators against @K pattern', () => {
        expect(matchesEvaluatorPattern('Precision@5', 'Precision@K')).toBe(true);
        expect(matchesEvaluatorPattern('Precision@10', 'Precision@K')).toBe(true);
        expect(matchesEvaluatorPattern('Precision@20', 'Precision@K')).toBe(true);
        expect(matchesEvaluatorPattern('Recall@5', 'Recall@K')).toBe(true);
        expect(matchesEvaluatorPattern('F1@10', 'F1@K')).toBe(true);
      });

      it('should not match different metric types', () => {
        expect(matchesEvaluatorPattern('Recall@5', 'Precision@K')).toBe(false);
        expect(matchesEvaluatorPattern('F1@10', 'Precision@K')).toBe(false);
      });

      it('should not match non-numeric suffixes', () => {
        expect(matchesEvaluatorPattern('Precision@abc', 'Precision@K')).toBe(false);
        expect(matchesEvaluatorPattern('Precision@K', 'Precision@K')).toBe(false);
      });

      it('should not match non-RAG evaluators against patterns', () => {
        expect(matchesEvaluatorPattern('Factuality', 'Precision@K')).toBe(false);
      });
    });
  });

  describe('findMatchingEvaluators', () => {
    const evaluatorNames = [
      'Precision@5',
      'Precision@10',
      'Precision@20',
      'Recall@5',
      'Recall@10',
      'F1@5',
      'F1@10',
      'Factuality',
      'Relevance',
    ];

    it('should find all evaluators matching a pattern', () => {
      expect(findMatchingEvaluators(evaluatorNames, 'Precision@K')).toEqual([
        'Precision@5',
        'Precision@10',
        'Precision@20',
      ]);
      expect(findMatchingEvaluators(evaluatorNames, 'Recall@K')).toEqual(['Recall@5', 'Recall@10']);
      expect(findMatchingEvaluators(evaluatorNames, 'F1@K')).toEqual(['F1@5', 'F1@10']);
    });

    it('should find exact matches', () => {
      expect(findMatchingEvaluators(evaluatorNames, 'Factuality')).toEqual(['Factuality']);
      expect(findMatchingEvaluators(evaluatorNames, 'Relevance')).toEqual(['Relevance']);
    });

    it('should return empty array for non-matching patterns', () => {
      expect(findMatchingEvaluators(evaluatorNames, 'NonExistent')).toEqual([]);
      expect(findMatchingEvaluators(evaluatorNames, 'Precision@K')).not.toContain('Factuality');
    });
  });

  describe('expandPatternsToEvaluators', () => {
    const evaluatorNames = [
      'Precision@5',
      'Precision@10',
      'Precision@20',
      'Recall@5',
      'Recall@10',
      'F1@5',
      'F1@10',
      'Factuality',
      'Relevance',
    ];

    it('should expand a single pattern to all matching evaluators', () => {
      expect(expandPatternsToEvaluators(['Precision@K'], evaluatorNames)).toEqual([
        'Precision@5',
        'Precision@10',
        'Precision@20',
      ]);
    });

    it('should expand multiple patterns', () => {
      const result = expandPatternsToEvaluators(['Precision@K', 'Recall@K'], evaluatorNames);
      expect(result).toContain('Precision@5');
      expect(result).toContain('Precision@10');
      expect(result).toContain('Precision@20');
      expect(result).toContain('Recall@5');
      expect(result).toContain('Recall@10');
      expect(result).toHaveLength(5);
    });

    it('should combine patterns with exact names', () => {
      const result = expandPatternsToEvaluators(
        ['Precision@K', 'Factuality', 'Relevance'],
        evaluatorNames
      );
      expect(result).toContain('Precision@5');
      expect(result).toContain('Precision@10');
      expect(result).toContain('Precision@20');
      expect(result).toContain('Factuality');
      expect(result).toContain('Relevance');
      expect(result).toHaveLength(5);
    });

    it('should not include duplicates', () => {
      // Even if the same evaluator would match multiple patterns (hypothetically)
      const result = expandPatternsToEvaluators(
        ['Precision@K', 'Factuality', 'Factuality'],
        evaluatorNames
      );
      const factualities = result.filter((name) => name === 'Factuality');
      expect(factualities).toHaveLength(1);
    });

    it('should return empty array when no patterns match', () => {
      expect(expandPatternsToEvaluators(['NonExistent'], evaluatorNames)).toEqual([]);
    });

    it('should ignore patterns that have no matches', () => {
      const result = expandPatternsToEvaluators(
        ['Precision@K', 'NonExistent', 'Factuality'],
        evaluatorNames
      );
      expect(result).toHaveLength(4); // 3 Precision@* + Factuality
      expect(result).not.toContain('NonExistent');
    });
  });
});
