/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMultiJudgeEvaluator } from '.';
import type { Evaluator, EvaluatorParams, EvaluationResult } from '../../types';

function mockJudge(name: string, score: number | null): Evaluator {
  return {
    name,
    kind: 'CODE',
    evaluate: async (): Promise<EvaluationResult> => ({
      score,
      label: 'test',
      explanation: `Score: ${score}`,
    }),
  };
}

function failingJudge(name: string): Evaluator {
  return {
    name,
    kind: 'CODE',
    evaluate: async (): Promise<EvaluationResult> => {
      throw new Error('Judge failed');
    },
  };
}

const defaultParams: EvaluatorParams<any, any> = {
  input: {},
  output: 'test output',
  expected: undefined,
  metadata: null,
};

describe('createMultiJudgeEvaluator', () => {
  it('sets kind to CODE when all judges are CODE', () => {
    const evaluator = createMultiJudgeEvaluator({
      judges: [mockJudge('a', 0.8), mockJudge('b', 0.6)],
    });

    expect(evaluator.kind).toBe('CODE');
  });

  it('sets kind to LLM when any judge is LLM', () => {
    const llmJudge: Evaluator = {
      name: 'llm',
      kind: 'LLM',
      evaluate: async (): Promise<EvaluationResult> => ({
        score: 0.9,
        label: 'test',
        explanation: 'Score: 0.9',
      }),
    };

    const evaluator = createMultiJudgeEvaluator({
      judges: [mockJudge('a', 0.8), llmJudge],
    });

    expect(evaluator.kind).toBe('LLM');
  });

  describe('mean strategy', () => {
    it('computes mean of all scores', async () => {
      const evaluator = createMultiJudgeEvaluator({
        judges: [mockJudge('a', 0.8), mockJudge('b', 0.6), mockJudge('c', 1.0)],
        strategy: 'mean',
      });

      const result = await evaluator.evaluate(defaultParams);
      expect(result.score).toBeCloseTo(0.8);
    });

    it('uses mean as default strategy', async () => {
      const evaluator = createMultiJudgeEvaluator({
        judges: [mockJudge('a', 0.4), mockJudge('b', 0.6)],
      });

      const result = await evaluator.evaluate(defaultParams);
      expect(result.score).toBeCloseTo(0.5);
    });
  });

  describe('median strategy', () => {
    it('returns middle value for odd count', async () => {
      const evaluator = createMultiJudgeEvaluator({
        judges: [mockJudge('a', 0.2), mockJudge('b', 0.8), mockJudge('c', 0.5)],
        strategy: 'median',
      });

      const result = await evaluator.evaluate(defaultParams);
      expect(result.score).toBeCloseTo(0.5);
    });

    it('returns average of two middle values for even count', async () => {
      const evaluator = createMultiJudgeEvaluator({
        judges: [
          mockJudge('a', 0.2),
          mockJudge('b', 0.4),
          mockJudge('c', 0.6),
          mockJudge('d', 0.8),
        ],
        strategy: 'median',
      });

      const result = await evaluator.evaluate(defaultParams);
      expect(result.score).toBeCloseTo(0.5);
    });
  });

  describe('majority strategy', () => {
    it('returns 1 when majority of scores round to 1', async () => {
      const evaluator = createMultiJudgeEvaluator({
        judges: [mockJudge('a', 0.9), mockJudge('b', 0.7), mockJudge('c', 0.3)],
        strategy: 'majority',
      });

      const result = await evaluator.evaluate(defaultParams);
      expect(result.score).toBe(1);
    });

    it('returns 0 when majority of scores round to 0', async () => {
      const evaluator = createMultiJudgeEvaluator({
        judges: [mockJudge('a', 0.1), mockJudge('b', 0.3), mockJudge('c', 0.8)],
        strategy: 'majority',
      });

      const result = await evaluator.evaluate(defaultParams);
      expect(result.score).toBe(0);
    });
  });

  describe('error handling', () => {
    it('skips failed judges', async () => {
      const evaluator = createMultiJudgeEvaluator({
        judges: [mockJudge('a', 0.8), failingJudge('b'), mockJudge('c', 0.6)],
      });

      const result = await evaluator.evaluate(defaultParams);
      expect(result.score).toBeCloseTo(0.7);
      expect(result.metadata).toHaveProperty('failedJudges');
      expect((result.metadata as any).failedJudges).toHaveLength(1);
      expect((result.metadata as any).failedJudges[0].name).toBe('b');
    });

    it('logs warnings for failed judges', async () => {
      const warn = jest.fn();
      const evaluator = createMultiJudgeEvaluator({
        judges: [mockJudge('a', 0.8), failingJudge('b')],
        logger: { warn },
      });

      await evaluator.evaluate(defaultParams);
      expect(warn).toHaveBeenCalledWith('Judge "b" failed: Judge failed');
    });

    it('skips judges with null scores', async () => {
      const evaluator = createMultiJudgeEvaluator({
        judges: [mockJudge('a', 0.8), mockJudge('b', null), mockJudge('c', 0.6)],
      });

      const result = await evaluator.evaluate(defaultParams);
      expect(result.score).toBeCloseTo(0.7);
    });

    it('returns null score when no judges succeed', async () => {
      const evaluator = createMultiJudgeEvaluator({
        judges: [failingJudge('a'), failingJudge('b')],
      });

      const result = await evaluator.evaluate(defaultParams);
      expect(result.score).toBeNull();
    });
  });
});
