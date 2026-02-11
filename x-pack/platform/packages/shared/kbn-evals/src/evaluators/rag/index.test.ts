/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createPrecisionAtKEvaluator,
  createRecallAtKEvaluator,
  createF1AtKEvaluator,
  createRagEvaluators,
} from '.';
import type { RagEvaluatorConfig, GroundTruth, RetrievedDoc } from './types';

interface TestOutput {
  retrievedDocs: RetrievedDoc[];
}

interface TestReferenceOutput {
  groundTruth: GroundTruth;
}

describe('RAG Evaluators', () => {
  const config: RagEvaluatorConfig<TestOutput, TestReferenceOutput> = {
    k: 5,
    relevanceThreshold: 1,
    extractRetrievedDocs: (output) => output.retrievedDocs,
    extractGroundTruth: (referenceOutput) => referenceOutput.groundTruth,
  };

  const groundTruth: GroundTruth = {
    'test-index': {
      doc_1: 1,
      doc_2: 2,
      doc_3: 1,
      doc_4: 1,
    },
  };

  const createDoc = (id: string, index = 'test-index'): RetrievedDoc => ({ index, id });

  describe('Precision@KEvaluator', () => {
    it('should calculate precision correctly', async () => {
      const evaluator = createPrecisionAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: {
          retrievedDocs: [
            createDoc('doc_1'),
            createDoc('doc_2'),
            createDoc('doc_X'),
            createDoc('doc_Y'),
            createDoc('doc_3'),
          ],
        },
        expected: { groundTruth },
        metadata: {},
      });

      // 3 relevant docs (doc_1, doc_2, doc_3) out of 5
      expect(result.score).toBe(0.6);
      expect(result.explanation).toContain('3 relevant docs in top 5');
    });

    it('should return unavailable when no ground truth', async () => {
      const evaluator = createPrecisionAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: [createDoc('doc_1'), createDoc('doc_2')] },
        expected: { groundTruth: {} },
        metadata: {},
      });

      expect(result.score).toBeNull();
      expect(result.label).toBe('unavailable');
    });

    it('should handle fewer retrieved docs than K', async () => {
      const evaluator = createPrecisionAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: [createDoc('doc_1'), createDoc('doc_2')] },
        expected: { groundTruth },
        metadata: {},
      });

      // 2 relevant docs out of K=5
      expect(result.score).toBe(0.4);
    });
  });

  describe('Recall@KEvaluator', () => {
    it('should calculate recall correctly', async () => {
      const evaluator = createRecallAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: {
          retrievedDocs: [
            createDoc('doc_1'),
            createDoc('doc_2'),
            createDoc('doc_X'),
            createDoc('doc_Y'),
            createDoc('doc_3'),
          ],
        },
        expected: { groundTruth },
        metadata: {},
      });

      // 3 relevant docs retrieved out of 4 total relevant
      expect(result.score).toBe(0.75);
      expect(result.explanation).toContain('3 of 4 relevant docs');
    });

    it('should return unavailable when no ground truth', async () => {
      const evaluator = createRecallAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: [createDoc('doc_1')] },
        expected: { groundTruth: {} },
        metadata: {},
      });

      expect(result.score).toBeNull();
      expect(result.label).toBe('unavailable');
    });
  });

  describe('F1@KEvaluator', () => {
    it('should calculate F1 correctly', async () => {
      const evaluator = createF1AtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: {
          retrievedDocs: [
            createDoc('doc_1'),
            createDoc('doc_2'),
            createDoc('doc_X'),
            createDoc('doc_Y'),
            createDoc('doc_3'),
          ],
        },
        expected: { groundTruth },
        metadata: {},
      });

      // Precision = 3/5 = 0.6, Recall = 3/4 = 0.75
      // F1 = 2 * (0.6 * 0.75) / (0.6 + 0.75) = 0.666...
      expect(result.score).toBeCloseTo(0.667, 2);
      expect(result.explanation).toContain('F1@5');
    });

    it('should return unavailable when no ground truth', async () => {
      const evaluator = createF1AtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: [createDoc('doc_1')] },
        expected: { groundTruth: {} },
        metadata: {},
      });

      expect(result.score).toBeNull();
    });
  });

  // Indirectly testing through Precision@KEvaluator
  describe('relevance threshold', () => {
    it('should use default threshold of 1 when not specified', async () => {
      const configWithoutThreshold: RagEvaluatorConfig<TestOutput, TestReferenceOutput> = {
        k: 5,
        extractRetrievedDocs: (output) => output.retrievedDocs,
        extractGroundTruth: (referenceOutput) => referenceOutput.groundTruth,
      };

      const evaluator = createPrecisionAtKEvaluator(configWithoutThreshold);

      const result = await evaluator.evaluate({
        input: {},
        output: {
          retrievedDocs: [
            createDoc('doc_1'),
            createDoc('doc_2'),
            createDoc('doc_3'),
            createDoc('doc_4'),
            createDoc('doc_X'),
          ],
        },
        expected: { groundTruth },
        metadata: {},
      });

      // All 4 docs with score >= 1 are relevant
      expect(result.score).toBe(0.8);
    });

    it('should respect higher relevance threshold', async () => {
      const highThresholdConfig: RagEvaluatorConfig<TestOutput, TestReferenceOutput> = {
        ...config,
        relevanceThreshold: 2,
      };

      const evaluator = createPrecisionAtKEvaluator(highThresholdConfig);

      const result = await evaluator.evaluate({
        input: {},
        output: {
          retrievedDocs: [
            createDoc('doc_1'),
            createDoc('doc_2'),
            createDoc('doc_3'),
            createDoc('doc_4'),
            createDoc('doc_X'),
          ],
        },
        expected: { groundTruth },
        metadata: {},
      });

      // Only doc_2 has score >= 2
      expect(result.score).toBe(0.2);
    });
  });

  describe('multi-index ground truth', () => {
    const multiIndexGroundTruth: GroundTruth = {
      'index-a': { doc_1: 1, doc_2: 1 },
      'index-b': { doc_3: 1, doc_4: 1 },
    };

    it('should match docs across multiple indices', async () => {
      const evaluator = createRecallAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: {
          retrievedDocs: [
            { index: 'index-a', id: 'doc_1' },
            { index: 'index-b', id: 'doc_3' },
            { index: 'index-a', id: 'doc_X' },
          ],
        },
        expected: { groundTruth: multiIndexGroundTruth },
        metadata: {},
      });

      // 2 relevant docs retrieved out of 4 total relevant
      expect(result.score).toBe(0.5);
    });

    it('should not match docs from wrong index', async () => {
      const evaluator = createPrecisionAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: {
          retrievedDocs: [
            { index: 'wrong-index', id: 'doc_1' },
            { index: 'wrong-index', id: 'doc_2' },
            { index: 'wrong-index', id: 'doc_3' },
            { index: 'wrong-index', id: 'doc_4' },
            { index: 'wrong-index', id: 'doc_5' },
          ],
        },
        expected: { groundTruth: multiIndexGroundTruth },
        metadata: {},
      });

      // No docs match because index is wrong
      expect(result.score).toBe(0);
    });
  });

  describe('filterByGroundTruthIndices', () => {
    const multiIndexGroundTruth: GroundTruth = {
      'index-a': { doc_1: 1 },
    };

    it('should filter docs to only ground truth indices when enabled via config', async () => {
      const filterConfig: RagEvaluatorConfig<TestOutput, TestReferenceOutput> = {
        ...config,
        k: 2, // Making the top K more sensitive to index filtering
        filterByGroundTruthIndices: true,
      };

      const evaluator = createPrecisionAtKEvaluator(filterConfig);

      const result = await evaluator.evaluate({
        input: {},
        output: {
          retrievedDocs: [
            { index: 'index-b', id: 'doc_X' },
            { index: 'index-b', id: 'doc_Y' },
            { index: 'index-a', id: 'doc_1' },
            { index: 'index-a', id: 'doc_Z' },
            { index: 'index-c', id: 'doc_W' },
          ],
        },
        expected: { groundTruth: multiIndexGroundTruth },
        metadata: {},
      });

      // After filtering: only index-a docs remain: [doc_1, doc_Z]
      // doc_1 is relevant, doc_Z is not
      // Precision = 1/2 = 0.5
      expect(result.score).toBe(0.5);
    });

    it('should not filter when filterByGroundTruthIndices is false', async () => {
      const noFilterConfig: RagEvaluatorConfig<TestOutput, TestReferenceOutput> = {
        ...config,
        k: 2, // Making the top K more sensitive to index filtering
        filterByGroundTruthIndices: false,
      };

      const evaluator = createPrecisionAtKEvaluator(noFilterConfig);

      const result = await evaluator.evaluate({
        input: {},
        output: {
          retrievedDocs: [
            { index: 'index-b', id: 'doc_X' },
            { index: 'index-b', id: 'doc_Y' },
            { index: 'index-a', id: 'doc_1' },
            { index: 'index-a', id: 'doc_Z' },
            { index: 'index-c', id: 'doc_W' },
          ],
        },
        expected: { groundTruth: multiIndexGroundTruth },
        metadata: {},
      });

      // No filtering: all 5 docs are considered
      // No relevant docs in top K
      // Precision = 0/5 = 0.0
      expect(result.score).toBe(0.0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty retrieved docs', async () => {
      const evaluator = createPrecisionAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: [] },
        expected: { groundTruth },
        metadata: {},
      });

      expect(result.score).toBe(0);
    });

    it('should handle all irrelevant retrieved docs', async () => {
      const evaluator = createRecallAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: {
          retrievedDocs: [createDoc('unknown_1'), createDoc('unknown_2'), createDoc('unknown_3')],
        },
        expected: { groundTruth },
        metadata: {},
      });

      expect(result.score).toBe(0);
    });

    it('should handle perfect retrieval', async () => {
      const evaluator = createF1AtKEvaluator({
        ...config,
        k: 4,
      });

      const result = await evaluator.evaluate({
        input: {},
        output: {
          retrievedDocs: [
            createDoc('doc_1'),
            createDoc('doc_2'),
            createDoc('doc_3'),
            createDoc('doc_4'),
          ],
        },
        expected: { groundTruth },
        metadata: {},
      });

      // Perfect precision (4/4) and perfect recall (4/4)
      expect(result.score).toBe(1);
    });
  });

  describe('extractor error handling', () => {
    it('should return unavailable when extractGroundTruth throws', async () => {
      const errorConfig: RagEvaluatorConfig<TestOutput, TestReferenceOutput> = {
        k: 5,
        extractRetrievedDocs: (output) => output.retrievedDocs,
        extractGroundTruth: () => {
          throw new Error('Ground truth extraction failed');
        },
      };

      const evaluator = createPrecisionAtKEvaluator(errorConfig);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: [createDoc('doc_1')] },
        expected: { groundTruth },
        metadata: {},
      });

      expect(result.score).toBeNull();
      expect(result.label).toBe('unavailable');
      expect(result.explanation).toContain('Ground truth extraction failed');
    });

    it('should return unavailable when extractRetrievedDocs throws', async () => {
      const errorConfig: RagEvaluatorConfig<TestOutput, TestReferenceOutput> = {
        k: 5,
        extractRetrievedDocs: () => {
          throw new Error('Retrieved docs extraction failed');
        },
        extractGroundTruth: (referenceOutput) => referenceOutput.groundTruth,
      };

      const evaluator = createRecallAtKEvaluator(errorConfig);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: [createDoc('doc_1')] },
        expected: { groundTruth },
        metadata: {},
      });

      expect(result.score).toBeNull();
      expect(result.label).toBe('unavailable');
      expect(result.explanation).toContain('Retrieved docs extraction failed');
    });
  });

  describe('evaluator naming', () => {
    it('should include K value in evaluator names', () => {
      const evaluator = createPrecisionAtKEvaluator({ ...config, k: 10 });
      expect(evaluator.name).toBe('Precision@10');
    });

    it('should use first K value for individual evaluator when array is passed', () => {
      const evaluator = createRecallAtKEvaluator({ ...config, k: [5, 10, 20] });
      expect(evaluator.name).toBe('Recall@5');
    });
  });

  describe('multi-K evaluation with createRagEvaluators', () => {
    it('should create evaluators for each K value, deduplicate, and sort', () => {
      const multiKConfig: RagEvaluatorConfig<TestOutput, TestReferenceOutput> = {
        ...config,
        k: [10, 5, 10, 20, 5],
      };

      const evaluators = createRagEvaluators(multiKConfig);

      expect(evaluators).toHaveLength(9);
      expect(evaluators.map((e) => e.name)).toEqual([
        'Precision@5',
        'Recall@5',
        'F1@5',
        'Precision@10',
        'Recall@10',
        'F1@10',
        'Precision@20',
        'Recall@20',
        'F1@20',
      ]);
    });

    it('should create 3 evaluators when k is a single number (backward compatibility)', () => {
      const singleKConfig: RagEvaluatorConfig<TestOutput, TestReferenceOutput> = {
        ...config,
        k: 5,
      };

      const evaluators = createRagEvaluators(singleKConfig);

      expect(evaluators).toHaveLength(3);
      expect(evaluators.map((e) => e.name)).toEqual(['Precision@5', 'Recall@5', 'F1@5']);
    });

    it('should calculate metrics correctly for different K values', async () => {
      const multiKConfig: RagEvaluatorConfig<TestOutput, TestReferenceOutput> = {
        ...config,
        k: [2, 5],
      };

      const evaluators = createRagEvaluators(multiKConfig);
      const precision2 = evaluators.find((e) => e.name === 'Precision@2')!;
      const precision5 = evaluators.find((e) => e.name === 'Precision@5')!;

      const output = {
        retrievedDocs: [
          createDoc('doc_1'),
          createDoc('doc_X'),
          createDoc('doc_2'),
          createDoc('doc_Y'),
          createDoc('doc_3'),
        ],
      };

      const result2 = await precision2.evaluate({
        input: {},
        output,
        expected: { groundTruth },
        metadata: {},
      });

      const result5 = await precision5.evaluate({
        input: {},
        output,
        expected: { groundTruth },
        metadata: {},
      });

      // Precision@2: 1 relevant doc (doc_1) in top 2 = 0.5
      expect(result2.score).toBe(0.5);
      // Precision@5: 3 relevant docs (doc_1, doc_2, doc_3) in top 5 = 0.6
      expect(result5.score).toBe(0.6);
    });
  });

  describe('RAG_EVAL_K environment variable', () => {
    const originalEnv = process.env.RAG_EVAL_K;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.RAG_EVAL_K = originalEnv;
      } else {
        delete process.env.RAG_EVAL_K;
      }
    });

    it('should parse comma-separated K values with mixed spacing', () => {
      process.env.RAG_EVAL_K = '5, 10,20';

      const evaluators = createRagEvaluators(config);

      expect(evaluators).toHaveLength(9);
      expect(evaluators.map((e) => e.name)).toEqual([
        'Precision@5',
        'Recall@5',
        'F1@5',
        'Precision@10',
        'Recall@10',
        'F1@10',
        'Precision@20',
        'Recall@20',
        'F1@20',
      ]);
    });

    it('should override config k when env var is set', () => {
      process.env.RAG_EVAL_K = '3';

      const multiKConfig: RagEvaluatorConfig<TestOutput, TestReferenceOutput> = {
        ...config,
        k: [5, 10, 20],
      };

      const evaluators = createRagEvaluators(multiKConfig);

      expect(evaluators).toHaveLength(3);
      expect(evaluators.map((e) => e.name)).toEqual(['Precision@3', 'Recall@3', 'F1@3']);
    });

    it('should throw error when env var is completely invalid', () => {
      process.env.RAG_EVAL_K = 'invalid';

      expect(() => createRagEvaluators({ ...config, k: 7 })).toThrow(
        'Invalid RAG_EVAL_K value(s): "invalid". All values must be positive integers.'
      );
    });

    it('should throw error when env var contains any invalid values', () => {
      process.env.RAG_EVAL_K = '5,invalid,10';

      expect(() => createRagEvaluators(config)).toThrow(
        'Invalid RAG_EVAL_K value(s): "invalid". All values must be positive integers.'
      );
    });

    it('should throw error for zero or negative values', () => {
      process.env.RAG_EVAL_K = '5,0,-1,10';

      expect(() => createRagEvaluators(config)).toThrow(
        'Invalid RAG_EVAL_K value(s): "0", "-1". All values must be positive integers.'
      );
    });

    it('should throw error for floating point values', () => {
      process.env.RAG_EVAL_K = '5,10.5,20';

      expect(() => createRagEvaluators(config)).toThrow(
        'Invalid RAG_EVAL_K value(s): "10.5". All values must be positive integers.'
      );
    });
  });
});
