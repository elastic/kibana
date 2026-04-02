/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { createMultiJudgeEvaluator } from '..';

const createMockEvaluator = (name: string, score: number | null): Evaluator => ({
  name,
  kind: 'CODE',
  evaluate: async () => ({
    score,
    label: score !== null && score >= 0.5 ? 'pass' : 'fail',
  }),
});

const defaultParams = {
  input: undefined,
  output: 'test output',
  expected: undefined,
  metadata: undefined,
};

describe('multi_judge evaluator', () => {
  describe('majority-vote', () => {
    it('should return 1.0 when all judges pass', async () => {
      const evaluator = createMultiJudgeEvaluator({
        evaluators: [
          createMockEvaluator('judge-a', 0.9),
          createMockEvaluator('judge-b', 0.8),
          createMockEvaluator('judge-c', 0.7),
        ],
        strategy: 'majority-vote',
      });
      const result = await evaluator.evaluate(defaultParams);
      expect(result.score).toBe(1.0);
    });

    it('should return proportion of passing judges', async () => {
      const evaluator = createMultiJudgeEvaluator({
        evaluators: [
          createMockEvaluator('judge-a', 0.9),
          createMockEvaluator('judge-b', 0.3),
          createMockEvaluator('judge-c', 0.7),
        ],
        strategy: 'majority-vote',
      });
      const result = await evaluator.evaluate(defaultParams);
      // 2 out of 3 pass (threshold 0.5)
      expect(result.score).toBeCloseTo(2 / 3, 3);
    });

    it('should respect custom passThreshold', async () => {
      const evaluator = createMultiJudgeEvaluator({
        evaluators: [
          createMockEvaluator('judge-a', 0.9),
          createMockEvaluator('judge-b', 0.7),
          createMockEvaluator('judge-c', 0.6),
        ],
        strategy: 'majority-vote',
        passThreshold: 0.8,
      });
      const result = await evaluator.evaluate(defaultParams);
      // Only judge-a passes (>= 0.8)
      expect(result.score).toBeCloseTo(1 / 3, 3);
    });
  });

  describe('median', () => {
    it('should return median of odd number of scores', async () => {
      const evaluator = createMultiJudgeEvaluator({
        evaluators: [
          createMockEvaluator('judge-a', 0.9),
          createMockEvaluator('judge-b', 0.5),
          createMockEvaluator('judge-c', 0.7),
        ],
        strategy: 'median',
      });
      const result = await evaluator.evaluate(defaultParams);
      expect(result.score).toBe(0.7);
    });

    it('should return average of middle two for even count', async () => {
      const evaluator = createMultiJudgeEvaluator({
        evaluators: [
          createMockEvaluator('judge-a', 0.9),
          createMockEvaluator('judge-b', 0.5),
          createMockEvaluator('judge-c', 0.7),
          createMockEvaluator('judge-d', 0.3),
        ],
        strategy: 'median',
      });
      const result = await evaluator.evaluate(defaultParams);
      // Sorted: 0.3, 0.5, 0.7, 0.9 → median = (0.5 + 0.7) / 2 = 0.6
      expect(result.score).toBe(0.6);
    });
  });

  describe('weighted-average', () => {
    it('should compute weighted average', async () => {
      const evaluator = createMultiJudgeEvaluator({
        evaluators: [createMockEvaluator('judge-a', 1.0), createMockEvaluator('judge-b', 0.5)],
        strategy: 'weighted-average',
        weights: { 'judge-a': 3, 'judge-b': 1 },
      });
      const result = await evaluator.evaluate(defaultParams);
      // (1.0 * 3 + 0.5 * 1) / (3 + 1) = 3.5 / 4 = 0.875
      expect(result.score).toBeCloseTo(0.875, 3);
    });

    it('should default to equal weights when not specified', async () => {
      const evaluator = createMultiJudgeEvaluator({
        evaluators: [createMockEvaluator('judge-a', 1.0), createMockEvaluator('judge-b', 0.5)],
        strategy: 'weighted-average',
      });
      const result = await evaluator.evaluate(defaultParams);
      expect(result.score).toBeCloseTo(0.75, 3);
    });
  });

  describe('borda-count', () => {
    it('should return normalized borda score', async () => {
      const evaluator = createMultiJudgeEvaluator({
        evaluators: [
          createMockEvaluator('judge-a', 0.9),
          createMockEvaluator('judge-b', 0.5),
          createMockEvaluator('judge-c', 0.7),
        ],
        strategy: 'borda-count',
      });
      const result = await evaluator.evaluate(defaultParams);
      // Sorted by score: 0.5(rank0), 0.7(rank1), 0.9(rank2)
      // Total rank = 0+1+2 = 3, max possible = 2*(2+1)/2 = 3
      // Score = 3/3 = 1.0
      expect(result.score).toBeCloseTo(1.0, 3);
    });
  });

  describe('edge cases', () => {
    it('should return unavailable when all judges return null', async () => {
      const evaluator = createMultiJudgeEvaluator({
        evaluators: [createMockEvaluator('judge-a', null), createMockEvaluator('judge-b', null)],
        strategy: 'median',
      });
      const result = await evaluator.evaluate(defaultParams);
      expect(result.score).toBeNull();
      expect(result.label).toBe('unavailable');
    });

    it('should skip null scores and aggregate valid ones', async () => {
      const evaluator = createMultiJudgeEvaluator({
        evaluators: [
          createMockEvaluator('judge-a', 0.8),
          createMockEvaluator('judge-b', null),
          createMockEvaluator('judge-c', 0.6),
        ],
        strategy: 'median',
      });
      const result = await evaluator.evaluate(defaultParams);
      // Only 0.6 and 0.8 → median = 0.7
      expect(result.score).toBe(0.7);
    });

    it('should include judge breakdown in metadata', async () => {
      const evaluator = createMultiJudgeEvaluator({
        evaluators: [createMockEvaluator('judge-a', 0.9), createMockEvaluator('judge-b', 0.5)],
        strategy: 'median',
      });
      const result = await evaluator.evaluate(defaultParams);
      const metadata = result.metadata as {
        judges: Array<{ evaluator: string; score: number | null }>;
        strategy: string;
      };
      expect(metadata.judges).toHaveLength(2);
      expect(metadata.strategy).toBe('median');
    });

    it('has correct name pattern', () => {
      const evaluator = createMultiJudgeEvaluator({
        evaluators: [],
        strategy: 'median',
      });
      expect(evaluator.name).toBe('multi-judge-median');
      expect(evaluator.kind).toBe('LLM');
    });
  });
});
