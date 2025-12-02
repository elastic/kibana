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
import type { RagEvaluatorConfig, GroundTruth } from './types';

interface TestOutput {
  retrievedDocs: string[];
}

interface TestMetadata {
  groundTruth: GroundTruth;
}

describe('RAG Evaluators', () => {
  const config: RagEvaluatorConfig<TestOutput, TestMetadata> = {
    k: 5,
    relevanceThreshold: 1,
    extractRetrievedDocs: (output) => output.retrievedDocs,
    extractGroundTruth: (metadata) => metadata.groundTruth,
  };

  const groundTruth: GroundTruth = {
    doc_1: 1,
    doc_2: 2,
    doc_3: 1,
    doc_4: 1,
  };

  describe('createPrecisionAtKEvaluator', () => {
    it('should calculate precision correctly', async () => {
      const evaluator = createPrecisionAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: ['doc_1', 'doc_2', 'doc_X', 'doc_Y', 'doc_3'] },
        expected: {},
        metadata: { groundTruth },
      });

      // 3 relevant docs (doc_1, doc_2, doc_3) out of 5
      expect(result.score).toBe(0.6);
      expect(result.explanation).toContain('3 relevant docs in top 5');
    });

    it('should return unavailable when no ground truth', async () => {
      const evaluator = createPrecisionAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: ['doc_1', 'doc_2'] },
        expected: {},
        metadata: { groundTruth: {} },
      });

      expect(result.score).toBeNull();
      expect(result.label).toBe('unavailable');
    });

    it('should handle fewer retrieved docs than K', async () => {
      const evaluator = createPrecisionAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: ['doc_1', 'doc_2'] },
        expected: {},
        metadata: { groundTruth },
      });

      // 2 relevant docs out of K=5
      expect(result.score).toBe(0.4);
    });

    it('should have correct evaluator metadata', () => {
      const evaluator = createPrecisionAtKEvaluator(config);
      expect(evaluator.name).toBe('Precision@K');
      expect(evaluator.kind).toBe('CODE');
    });
  });

  describe('createRecallAtKEvaluator', () => {
    it('should calculate recall correctly', async () => {
      const evaluator = createRecallAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: ['doc_1', 'doc_2', 'doc_X', 'doc_Y', 'doc_3'] },
        expected: {},
        metadata: { groundTruth },
      });

      // 3 relevant docs retrieved out of 4 total relevant
      expect(result.score).toBe(0.75);
      expect(result.explanation).toContain('3 of 4 relevant docs');
    });

    it('should return unavailable when no ground truth', async () => {
      const evaluator = createRecallAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: ['doc_1'] },
        expected: {},
        metadata: { groundTruth: {} },
      });

      expect(result.score).toBeNull();
      expect(result.label).toBe('unavailable');
    });

    it('should have correct evaluator metadata', () => {
      const evaluator = createRecallAtKEvaluator(config);
      expect(evaluator.name).toBe('Recall@K');
      expect(evaluator.kind).toBe('CODE');
    });
  });

  describe('createF1AtKEvaluator', () => {
    it('should calculate F1 correctly', async () => {
      const evaluator = createF1AtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: ['doc_1', 'doc_2', 'doc_X', 'doc_Y', 'doc_3'] },
        expected: {},
        metadata: { groundTruth },
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
        output: { retrievedDocs: ['doc_1'] },
        expected: {},
        metadata: { groundTruth: {} },
      });

      expect(result.score).toBeNull();
      expect(result.label).toBe('unavailable');
    });

    it('should have correct evaluator metadata', () => {
      const evaluator = createF1AtKEvaluator(config);
      expect(evaluator.name).toBe('F1@K');
      expect(evaluator.kind).toBe('CODE');
    });
  });

  describe('createRagEvaluators', () => {
    it('should create all three evaluators', () => {
      const evaluators = createRagEvaluators(config);
      expect(evaluators).toHaveLength(3);
      expect(evaluators.map((e) => e.name)).toEqual(['Precision@K', 'Recall@K', 'F1@K']);
    });
  });

  describe('relevance threshold', () => {
    it('should use default threshold of 1 when not specified', async () => {
      const configWithoutThreshold: RagEvaluatorConfig<TestOutput, TestMetadata> = {
        k: 5,
        extractRetrievedDocs: (output) => output.retrievedDocs,
        extractGroundTruth: (metadata) => metadata.groundTruth,
      };

      const evaluator = createPrecisionAtKEvaluator(configWithoutThreshold);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: ['doc_1', 'doc_2', 'doc_3', 'doc_4', 'doc_X'] },
        expected: {},
        metadata: { groundTruth },
      });

      // All 4 docs with score >= 1 are relevant
      expect(result.score).toBe(0.8);
    });

    it('should respect higher relevance threshold', async () => {
      const highThresholdConfig: RagEvaluatorConfig<TestOutput, TestMetadata> = {
        ...config,
        relevanceThreshold: 2,
      };

      const evaluator = createPrecisionAtKEvaluator(highThresholdConfig);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: ['doc_1', 'doc_2', 'doc_3', 'doc_4', 'doc_X'] },
        expected: {},
        metadata: { groundTruth },
      });

      // Only doc_2 has score >= 2
      expect(result.score).toBe(0.2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty retrieved docs', async () => {
      const evaluator = createPrecisionAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: [] },
        expected: {},
        metadata: { groundTruth },
      });

      expect(result.score).toBe(0);
    });

    it('should handle all irrelevant retrieved docs', async () => {
      const evaluator = createRecallAtKEvaluator(config);

      const result = await evaluator.evaluate({
        input: {},
        output: { retrievedDocs: ['unknown_1', 'unknown_2', 'unknown_3'] },
        expected: {},
        metadata: { groundTruth },
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
        output: { retrievedDocs: ['doc_1', 'doc_2', 'doc_3', 'doc_4'] },
        expected: {},
        metadata: { groundTruth },
      });

      // Perfect precision (4/4) and perfect recall (4/4)
      expect(result.score).toBe(1);
    });
  });
});
