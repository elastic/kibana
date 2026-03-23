/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isKSpecificRagEvaluator,
  matchesEvaluatorPattern,
  expandPatternsToEvaluators,
} from './patterns';

describe('evaluator patterns', () => {
  describe('isKSpecificRagEvaluator', () => {
    it('should return true for K-specific evaluator names', () => {
      expect(isKSpecificRagEvaluator('Precision@5')).toBe(true);
      expect(isKSpecificRagEvaluator('Precision@10')).toBe(true);
      expect(isKSpecificRagEvaluator('Recall@5')).toBe(true);
      expect(isKSpecificRagEvaluator('F1@10')).toBe(true);
    });

    it('should return false for pattern names and non-RAG evaluators', () => {
      expect(isKSpecificRagEvaluator('Precision@K')).toBe(false);
      expect(isKSpecificRagEvaluator('Factuality')).toBe(false);
      expect(isKSpecificRagEvaluator('Precision@abc')).toBe(false);
      expect(isKSpecificRagEvaluator('Precision@')).toBe(false);
    });
  });

  describe('matchesEvaluatorPattern', () => {
    it('should match exact names', () => {
      expect(matchesEvaluatorPattern('Factuality', 'Factuality')).toBe(true);
      expect(matchesEvaluatorPattern('Factuality', 'Relevance')).toBe(false);
    });

    it('should match K-specific evaluators against @K pattern', () => {
      expect(matchesEvaluatorPattern('Precision@5', 'Precision@K')).toBe(true);
      expect(matchesEvaluatorPattern('Precision@10', 'Precision@K')).toBe(true);
      expect(matchesEvaluatorPattern('Recall@5', 'Recall@K')).toBe(true);
      expect(matchesEvaluatorPattern('F1@10', 'F1@K')).toBe(true);
    });

    it('should not match different metric types or invalid patterns', () => {
      expect(matchesEvaluatorPattern('Recall@5', 'Precision@K')).toBe(false);
      expect(matchesEvaluatorPattern('Precision@abc', 'Precision@K')).toBe(false);
      expect(matchesEvaluatorPattern('Precision@K', 'Precision@K')).toBe(false);
      expect(matchesEvaluatorPattern('Factuality', 'Precision@K')).toBe(false);
    });
  });

  describe('expandPatternsToEvaluators', () => {
    const evaluatorNames = [
      'Precision@5',
      'Precision@10',
      'Precision@20',
      'Recall@5',
      'Recall@10',
      'Factuality',
    ];

    it('should expand patterns to matching evaluators', () => {
      expect(expandPatternsToEvaluators(['Precision@K'], evaluatorNames)).toEqual([
        'Precision@5',
        'Precision@10',
        'Precision@20',
      ]);
    });

    it('should expand multiple patterns and combine with exact names', () => {
      const result = expandPatternsToEvaluators(['Precision@K', 'Factuality'], evaluatorNames);
      expect(result).toContain('Precision@5');
      expect(result).toContain('Precision@10');
      expect(result).toContain('Precision@20');
      expect(result).toContain('Factuality');
      expect(result).toHaveLength(4);
    });

    it('should deduplicate and ignore non-matching patterns', () => {
      const result = expandPatternsToEvaluators(
        ['Precision@K', 'Factuality', 'Factuality', 'NonExistent'],
        evaluatorNames
      );
      expect(result.filter((n) => n === 'Factuality')).toHaveLength(1);
      expect(result).not.toContain('NonExistent');
    });

    it('should return empty array when no patterns match', () => {
      expect(expandPatternsToEvaluators(['NonExistent'], evaluatorNames)).toEqual([]);
    });
  });
});
