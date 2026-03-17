/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { optimizePrompt } from './optimizer';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvalsExecutorClient, EvaluationDataset, Evaluator, RanExperiment } from '../types';

const createMockInferenceClient = (
  improvedPrompts: string[]
): BoundInferenceClient => {
  let callIdx = 0;
  const outputFn = jest.fn().mockImplementation(async () => {
    const prompt = improvedPrompts[callIdx] ?? improvedPrompts[improvedPrompts.length - 1];
    callIdx++;
    return {
      id: 'prompt_mutation',
      output: {
        improved_prompt: prompt,
        change_description: 'Improved clarity',
      },
      content: '',
    };
  });

  return { output: outputFn, bindTo: jest.fn() } as unknown as BoundInferenceClient;
};

const createMockExecutorClient = (scores: number[]): EvalsExecutorClient => {
  let callIdx = 0;
  return {
    runExperiment: jest.fn().mockImplementation(async () => {
      const score = scores[callIdx] ?? scores[scores.length - 1];
      callIdx++;
      return {
        id: `exp-${callIdx}`,
        datasetId: 'ds-1',
        datasetName: 'Test',
        runs: {},
        evaluationRuns: [
          {
            name: 'criteria',
            result: { score },
            experimentRunId: `exp-${callIdx}`,
          },
        ],
      } as RanExperiment;
    }),
    getRanExperiments: jest.fn().mockResolvedValue([]),
  };
};

const mockDataset: EvaluationDataset = {
  name: 'test-dataset',
  description: 'Test dataset for optimization',
  examples: [
    { input: { query: 'hello' }, output: 'world' },
    { input: { query: 'test' }, output: 'result' },
  ],
};

const mockEvaluators: Evaluator[] = [
  {
    name: 'criteria',
    kind: 'CODE',
    evaluate: jest.fn().mockResolvedValue({ score: 0.8 }),
  },
];

const mockTask = jest.fn().mockResolvedValue({ response: 'ok' });

describe('optimizePrompt', () => {
  it('runs the specified number of iterations', async () => {
    const client = createMockInferenceClient(['improved v1', 'improved v2', 'improved v3']);
    const executor = createMockExecutorClient([0.5, 0.6, 0.7, 0.8]);

    const result = await optimizePrompt({
      basePrompt: 'You are a helpful assistant.',
      dataset: mockDataset,
      task: mockTask,
      evaluators: mockEvaluators,
      executorClient: executor,
      inferenceClient: client,
      config: { maxIterations: 3 },
    });

    expect(result.iterations).toHaveLength(3);
    expect(client.output).toHaveBeenCalledTimes(3);
  });

  it('keeps the best prompt when improvements are found', async () => {
    const executor = createMockExecutorClient([0.5, 0.8, 0.6, 0.9]);
    const client = createMockInferenceClient(['better', 'worse', 'best']);

    const result = await optimizePrompt({
      basePrompt: 'original',
      dataset: mockDataset,
      task: mockTask,
      evaluators: mockEvaluators,
      executorClient: executor,
      inferenceClient: client,
      config: { maxIterations: 3 },
    });

    expect(result.bestScore).toBe(0.9);
  });

  it('returns original prompt when no iteration improves', async () => {
    const executor = createMockExecutorClient([0.9, 0.5, 0.5, 0.5]);
    const client = createMockInferenceClient(['worse1', 'worse2', 'worse3']);

    const result = await optimizePrompt({
      basePrompt: 'already great',
      dataset: mockDataset,
      task: mockTask,
      evaluators: mockEvaluators,
      executorClient: executor,
      inferenceClient: client,
      config: { maxIterations: 3 },
    });

    expect(result.bestPrompt).toBe('already great');
    expect(result.iterations.every((i) => !i.improved)).toBe(true);
  });

  it('marks iterations as improved or not', async () => {
    const executor = createMockExecutorClient([0.5, 0.7, 0.6]);
    const client = createMockInferenceClient(['v1', 'v2']);

    const result = await optimizePrompt({
      basePrompt: 'base',
      dataset: mockDataset,
      task: mockTask,
      evaluators: mockEvaluators,
      executorClient: executor,
      inferenceClient: client,
      config: { maxIterations: 2 },
    });

    expect(result.iterations[0].improved).toBe(true);
    expect(result.iterations[1].improved).toBe(false);
  });

  it('calculates improvement percentage', async () => {
    // Scores: baseline=0.5, iter1 candidate=0.6 (improved), iter2 candidate=0.9 (improved)
    const executor = createMockExecutorClient([0.5, 0.6, 0.9]);
    const client = createMockInferenceClient(['better', 'best']);

    const result = await optimizePrompt({
      basePrompt: 'base',
      dataset: mockDataset,
      task: mockTask,
      evaluators: mockEvaluators,
      executorClient: executor,
      inferenceClient: client,
      config: { maxIterations: 2 },
    });

    // initialScore = 0.5 (first scorePrompt call before loop)
    // bestScore = 0.9
    // improvement = (0.9 - 0.5) / 0.5 * 100 = 80
    expect(result.improvement).toBeCloseTo(80, 1);
    expect(result.bestScore).toBe(0.9);
  });

  it('handles zero-iteration config', async () => {
    const executor = createMockExecutorClient([0.8]);
    const client = createMockInferenceClient([]);

    const result = await optimizePrompt({
      basePrompt: 'base',
      dataset: mockDataset,
      task: mockTask,
      evaluators: mockEvaluators,
      executorClient: executor,
      inferenceClient: client,
      config: { maxIterations: 0 },
    });

    expect(result.iterations).toHaveLength(0);
    expect(result.bestPrompt).toBe('base');
  });

  it('handles empty evaluation runs gracefully', async () => {
    const executor: EvalsExecutorClient = {
      runExperiment: jest.fn().mockResolvedValue({
        id: 'exp-1',
        datasetId: 'ds-1',
        datasetName: 'Test',
        runs: {},
        evaluationRuns: [],
      }),
      getRanExperiments: jest.fn().mockResolvedValue([]),
    };
    const client = createMockInferenceClient(['v1']);

    const result = await optimizePrompt({
      basePrompt: 'base',
      dataset: mockDataset,
      task: mockTask,
      evaluators: mockEvaluators,
      executorClient: executor,
      inferenceClient: client,
      config: { maxIterations: 1 },
    });

    expect(result.bestScore).toBe(0);
  });
});
