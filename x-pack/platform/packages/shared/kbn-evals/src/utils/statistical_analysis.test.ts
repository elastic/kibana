/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelFamily, ModelProvider } from '@kbn/inference-common';
import type { EvaluationScoreDocument } from './score_repository';
import { computePairedTTestResults, pairScores } from './statistical_analysis';

const baseTaskModel = {
  id: 'gpt-4',
  family: ModelFamily.GPT,
  provider: ModelProvider.OpenAI,
};

const baseEvaluatorModel = {
  id: 'claude-3',
  family: ModelFamily.Claude,
  provider: ModelProvider.Anthropic,
};

const createMockScore = ({
  datasetId = 'dataset-1',
  datasetName = 'Dataset 1',
  exampleId = 'example-1',
  evaluatorName = 'Correctness',
  repetitionIndex = 0,
  score = 0.5,
}: Partial<{
  datasetId: string;
  datasetName: string;
  exampleId: string;
  evaluatorName: string;
  repetitionIndex: number;
  score: number | null;
}> = {}): EvaluationScoreDocument => ({
  '@timestamp': '2025-01-01T00:00:00Z',
  run_id: 'run-123',
  experiment_id: 'exp-1',
  example: {
    id: exampleId,
    index: 0,
    dataset: {
      id: datasetId,
      name: datasetName,
    },
  },
  task: {
    trace_id: 'trace-task-123',
    repetition_index: repetitionIndex,
    model: baseTaskModel,
  },
  evaluator: {
    name: evaluatorName,
    score,
    label: 'PASS',
    explanation: 'Mock evaluation',
    metadata: { successful: 1, failed: 0 },
    trace_id: 'trace-eval-456',
    model: baseEvaluatorModel,
  },
  run_metadata: {
    git_branch: 'main',
    git_commit_sha: 'abc123',
    total_repetitions: 1,
  },
  environment: {
    hostname: 'test-machine',
  },
});

describe('pairScores', () => {
  it('pairs scores by dataset, example, evaluator, and repetition', () => {
    const scoresA = [createMockScore({ score: 0.8 })];
    const scoresB = [createMockScore({ score: 0.9 })];

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(scoresA, scoresB);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].scoreA).toBe(0.8);
    expect(pairs[0].scoreB).toBe(0.9);
    expect(skippedMissingPairs).toBe(0);
    expect(skippedNullScores).toBe(0);
  });

  it('skips pairs where either score is null', () => {
    const scoresA = [createMockScore({ score: null })];
    const scoresB = [createMockScore({ score: 0.9 })];

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(scoresA, scoresB);

    expect(pairs).toHaveLength(0);
    expect(skippedMissingPairs).toBe(0);
    expect(skippedNullScores).toBe(1);
  });

  it('skips pairs when the matching score is null', () => {
    const scoresA = [createMockScore({ score: 0.8 })];
    const scoresB = [createMockScore({ score: null })];

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(scoresA, scoresB);

    expect(pairs).toHaveLength(0);
    expect(skippedMissingPairs).toBe(1);
    expect(skippedNullScores).toBe(1);
  });

  it('skips pairs with no match in other run', () => {
    const scoresA = [createMockScore({ exampleId: 'example-a', score: 0.8 })];
    const scoresB = [createMockScore({ exampleId: 'example-b', score: 0.9 })];

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(scoresA, scoresB);

    expect(pairs).toHaveLength(0);
    expect(skippedMissingPairs).toBe(1);
    expect(skippedNullScores).toBe(0);
  });
});

describe('computePairedTTestResults', () => {
  it('groups results by dataset and evaluator', () => {
    const scoresA = [
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 0.8 }),
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval2', score: 0.7 }),
    ];
    const scoresB = [
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 0.9 }),
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval2', score: 0.75 }),
    ];

    const results = computePairedTTestResults(scoresA, scoresB);

    expect(results).toHaveLength(2);
    expect(results.map((result) => result.evaluatorName).sort()).toEqual(['eval1', 'eval2']);
  });

  it('computes correct means for each group', () => {
    const scoresA = [
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 0.2 }),
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 0.4, exampleId: 'ex2' }),
    ];
    const scoresB = [
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 0.6 }),
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 1.0, exampleId: 'ex2' }),
    ];

    const [result] = computePairedTTestResults(scoresA, scoresB);

    expect(result.meanA).toBeCloseTo(0.3, 5);
    expect(result.meanB).toBeCloseTo(0.8, 5);
    expect(result.sampleSize).toBe(2);
  });

  it('returns null p-value when sample size is under 2', () => {
    const scoresA = [createMockScore({ score: 0.8 })];
    const scoresB = [createMockScore({ score: 0.9 })];

    const [result] = computePairedTTestResults(scoresA, scoresB);

    expect(result.pValue).toBeNull();
  });

  it('computes p-value for paired differences', () => {
    const scoresA = [
      createMockScore({ exampleId: 'ex1', score: 1 }),
      createMockScore({ exampleId: 'ex2', score: 2 }),
      createMockScore({ exampleId: 'ex3', score: 3 }),
      createMockScore({ exampleId: 'ex4', score: 4 }),
      createMockScore({ exampleId: 'ex5', score: 5 }),
    ];
    const scoresB = [
      createMockScore({ exampleId: 'ex1', score: 0 }),
      createMockScore({ exampleId: 'ex2', score: 0 }),
      createMockScore({ exampleId: 'ex3', score: 0 }),
      createMockScore({ exampleId: 'ex4', score: 0 }),
      createMockScore({ exampleId: 'ex5', score: 0 }),
    ];

    const [result] = computePairedTTestResults(scoresA, scoresB);

    expect(result.pValue).not.toBeNull();
    expect(result.pValue as number).toBeCloseTo(0.013, 2);
  });
});
