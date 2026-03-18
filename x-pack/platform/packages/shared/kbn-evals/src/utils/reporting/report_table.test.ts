/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorStats } from '../score_repository';
import type { EvaluatorDisplayGroup, EvaluatorDisplayOptions } from './report_table';
import { createTable } from './report_table';

describe('report_table', () => {
  /**
   * Creates mock EvaluatorStats array from a simplified record format.
   * Each entry in the record becomes an EvaluatorStats object for the given dataset.
   */
  const createMockEvaluatorStats = (
    datasetId: string,
    datasetName: string,
    evaluatorData: Record<string, { mean: number; count: number }>
  ): EvaluatorStats[] => {
    return Object.entries(evaluatorData).map(([evaluatorName, data]) => ({
      datasetId,
      datasetName,
      evaluatorName,
      stats: {
        mean: data.mean,
        median: data.mean,
        stdDev: 0.1,
        min: data.mean - 0.1,
        max: data.mean + 0.1,
        count: data.count,
      },
    }));
  };

  describe('createTable with pattern-based grouping', () => {
    it('should group evaluators using @K patterns', () => {
      const stats = createMockEvaluatorStats('test-dataset-id', 'test-dataset', {
        'Precision@5': { mean: 0.8, count: 10 },
        'Precision@10': { mean: 0.7, count: 10 },
        'Recall@5': { mean: 0.6, count: 10 },
        'Recall@10': { mean: 0.5, count: 10 },
        'F1@5': { mean: 0.68, count: 10 },
        'F1@10': { mean: 0.58, count: 10 },
        Factuality: { mean: 0.9, count: 10 },
      });

      const evaluatorDisplayGroups: EvaluatorDisplayGroup[] = [
        {
          evaluatorNames: ['Precision@K', 'Recall@K', 'F1@K'],
          combinedColumnName: 'RAG',
        },
      ];

      const result = createTable(stats, 1, { evaluatorDisplayGroups });

      // The table should have the RAG column (grouped)
      expect(result).toContain('RAG');
      // And the ungrouped Factuality column
      expect(result).toContain('Factuality');
      // The individual RAG evaluators should still appear in the grouped cell
      expect(result).toContain('Precision@5');
      expect(result).toContain('Precision@10');
      expect(result).toContain('Recall@5');
      expect(result).toContain('Recall@10');
      expect(result).toContain('F1@5');
      expect(result).toContain('F1@10');
    });

    it('should handle multiple K values for RAG evaluators', () => {
      const stats = createMockEvaluatorStats('test-dataset-id', 'test-dataset', {
        'Precision@5': { mean: 0.8, count: 10 },
        'Precision@10': { mean: 0.7, count: 10 },
        'Precision@20': { mean: 0.6, count: 10 },
        'Recall@5': { mean: 0.6, count: 10 },
        'Recall@10': { mean: 0.5, count: 10 },
        'Recall@20': { mean: 0.4, count: 10 },
        'F1@5': { mean: 0.68, count: 10 },
        'F1@10': { mean: 0.58, count: 10 },
        'F1@20': { mean: 0.48, count: 10 },
      });

      const evaluatorDisplayGroups: EvaluatorDisplayGroup[] = [
        {
          evaluatorNames: ['Precision@K', 'Recall@K', 'F1@K'],
          combinedColumnName: 'RAG',
        },
      ];

      const result = createTable(stats, 1, { evaluatorDisplayGroups });

      // All K values should be in the grouped column
      expect(result).toContain('Precision@5');
      expect(result).toContain('Precision@10');
      expect(result).toContain('Precision@20');
      expect(result).toContain('Recall@5');
      expect(result).toContain('Recall@10');
      expect(result).toContain('Recall@20');
      expect(result).toContain('F1@5');
      expect(result).toContain('F1@10');
      expect(result).toContain('F1@20');
    });

    it('should not create group when no evaluators match the pattern', () => {
      const stats = createMockEvaluatorStats('test-dataset-id', 'test-dataset', {
        Factuality: { mean: 0.9, count: 10 },
        Relevance: { mean: 0.85, count: 10 },
      });

      const evaluatorDisplayGroups: EvaluatorDisplayGroup[] = [
        {
          evaluatorNames: ['Precision@K', 'Recall@K', 'F1@K'],
          combinedColumnName: 'RAG',
        },
      ];

      const result = createTable(stats, 1, { evaluatorDisplayGroups });

      // RAG column should not appear since no RAG evaluators exist
      expect(result).not.toContain('RAG');
      // But the other evaluators should appear as individual columns
      expect(result).toContain('Factuality');
      expect(result).toContain('Relevance');
    });

    it('should apply display options using patterns', () => {
      const stats = createMockEvaluatorStats('test-dataset-id', 'test-dataset', {
        'Precision@5': { mean: 0.8, count: 10 },
        'Precision@10': { mean: 0.7, count: 10 },
      });

      const evaluatorDisplayOptions = new Map<string, EvaluatorDisplayOptions>([
        ['Precision@K', { decimalPlaces: 3, statsToInclude: ['mean'] }],
      ]);

      const result = createTable(stats, 1, { evaluatorDisplayOptions });

      // The table should be created (basic sanity check)
      expect(result).toContain('Precision@5');
      expect(result).toContain('Precision@10');
    });

    it('should combine pattern groups with exact name groups', () => {
      const stats = createMockEvaluatorStats('test-dataset-id', 'test-dataset', {
        'Precision@5': { mean: 0.8, count: 10 },
        'Recall@5': { mean: 0.6, count: 10 },
        'F1@5': { mean: 0.68, count: 10 },
        InputTokens: { mean: 1000, count: 10 },
        OutputTokens: { mean: 500, count: 10 },
        CachedTokens: { mean: 200, count: 10 },
      });

      const evaluatorDisplayGroups: EvaluatorDisplayGroup[] = [
        {
          evaluatorNames: ['InputTokens', 'OutputTokens', 'CachedTokens'],
          combinedColumnName: 'Tokens',
        },
        {
          evaluatorNames: ['Precision@K', 'Recall@K', 'F1@K'],
          combinedColumnName: 'RAG',
        },
      ];

      const result = createTable(stats, 1, { evaluatorDisplayGroups });

      // Both groups should appear
      expect(result).toContain('Tokens');
      expect(result).toContain('RAG');

      // Token evaluators in Tokens column
      expect(result).toContain('InputTokens');
      expect(result).toContain('OutputTokens');
      expect(result).toContain('CachedTokens');

      // RAG evaluators in RAG column
      expect(result).toContain('Precision@5');
      expect(result).toContain('Recall@5');
      expect(result).toContain('F1@5');
    });

    it('should handle partial pattern matches', () => {
      // When only some RAG evaluators are present
      const stats = createMockEvaluatorStats('test-dataset-id', 'test-dataset', {
        'Precision@5': { mean: 0.8, count: 10 },
        'Precision@10': { mean: 0.7, count: 10 },
        // No Recall or F1 evaluators
        Factuality: { mean: 0.9, count: 10 },
      });

      const evaluatorDisplayGroups: EvaluatorDisplayGroup[] = [
        {
          evaluatorNames: ['Precision@K', 'Recall@K', 'F1@K'],
          combinedColumnName: 'RAG',
        },
      ];

      const result = createTable(stats, 1, { evaluatorDisplayGroups });

      // RAG group should still be created with available evaluators
      expect(result).toContain('RAG');
      expect(result).toContain('Precision@5');
      expect(result).toContain('Precision@10');
      expect(result).toContain('Factuality');
    });
  });

  describe('createTable basic functionality', () => {
    it('should create a table with dataset rows and overall row', () => {
      const stats = [
        ...createMockEvaluatorStats('dataset-1-id', 'dataset-1', {
          Factuality: { mean: 0.9, count: 10 },
        }),
        ...createMockEvaluatorStats('dataset-2-id', 'dataset-2', {
          Factuality: { mean: 0.8, count: 10 },
        }),
      ];

      const result = createTable(stats, 1);

      expect(result).toContain('dataset-1');
      expect(result).toContain('dataset-2');
      expect(result).toContain('Overall');
    });

    it('should show repetition info when repetitions > 1', () => {
      const stats = createMockEvaluatorStats('test-dataset-id', 'test-dataset', {
        Factuality: { mean: 0.9, count: 30 },
      });

      const result = createTable(stats, 3);

      // Should show "3 x N" format where N is count/repetitions
      // count is 30, so 30/3 = 10
      expect(result).toContain('3 x');
    });
  });
});
