/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Direction, EvaluationScoreDocument } from '@kbn/evals-common';
import { computePairedTTestResults, pairScores } from './statistical_analysis';

const baseTaskModel = {
  id: 'gpt-4',
  family: 'gpt',
  provider: 'openai',
};

const baseEvaluatorModel = {
  id: 'claude-3',
  family: 'claude',
  provider: 'anthropic',
};

const createMockScore = ({
  datasetId = 'dataset-1',
  datasetName = 'Dataset 1',
  exampleId = 'example-1',
  evaluatorName = 'Correctness',
  repetitionIndex = 0,
  score = 0.5,
  direction,
}: Partial<{
  datasetId: string;
  datasetName: string;
  exampleId: string;
  evaluatorName: string;
  repetitionIndex: number;
  score: number | null;
  direction: Direction;
}> = {}): EvaluationScoreDocument => ({
  '@timestamp': '2025-01-01T00:00:00Z',
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
    output: {},
  },
  evaluator: {
    name: evaluatorName,
    score,
    label: 'PASS',
    explanation: 'Mock evaluation',
    metadata: { successful: 1, failed: 0 },
    trace_id: 'trace-eval-456',
    ...(direction !== undefined && { direction }),
    model: baseEvaluatorModel,
  },
  metadata: {
    total_repetitions: 1,
    hostname: 'test-machine',
    git: { branch: 'main', commit_sha: 'abc123' },
  },
});

describe('pairScores', () => {
  it('pairs scores by dataset, example, evaluator, and repetition', () => {
    const targetScores = [createMockScore({ score: 0.8 })];
    const baselineScores = [createMockScore({ score: 0.9 })];

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
      targetScores,
      baselineScores
    );

    expect(pairs).toHaveLength(1);
    expect(pairs[0].scoreTarget).toBe(0.8);
    expect(pairs[0].scoreBaseline).toBe(0.9);
    expect(skippedMissingPairs).toBe(0);
    expect(skippedNullScores).toBe(0);
  });

  it('skips pairs where either score is null', () => {
    const targetScores = [createMockScore({ score: null })];
    const baselineScores = [createMockScore({ score: 0.9 })];

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
      targetScores,
      baselineScores
    );

    expect(pairs).toHaveLength(0);
    expect(skippedMissingPairs).toBe(0);
    expect(skippedNullScores).toBe(1);
  });

  it('skips pairs when the matching score is null', () => {
    const targetScores = [createMockScore({ score: 0.8 })];
    const baselineScores = [createMockScore({ score: null })];

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
      targetScores,
      baselineScores
    );

    expect(pairs).toHaveLength(0);
    expect(skippedMissingPairs).toBe(1);
    expect(skippedNullScores).toBe(1);
  });

  it('skips pairs with no match in other run', () => {
    const targetScores = [createMockScore({ exampleId: 'example-a', score: 0.8 })];
    const baselineScores = [createMockScore({ exampleId: 'example-b', score: 0.9 })];

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
      targetScores,
      baselineScores
    );

    expect(pairs).toHaveLength(0);
    expect(skippedMissingPairs).toBe(2);
    expect(skippedNullScores).toBe(0);
  });

  it('counts baseline-only examples as missing pairs', () => {
    const targetScores = [createMockScore({ exampleId: 'example-1', score: 0.8 })];
    const baselineScores = [
      createMockScore({ exampleId: 'example-1', score: 0.9 }),
      createMockScore({ exampleId: 'example-2', score: 0.7 }),
    ];

    const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
      targetScores,
      baselineScores
    );

    expect(pairs).toHaveLength(1);
    expect(skippedMissingPairs).toBe(1);
    expect(skippedNullScores).toBe(0);
  });
});

describe('computePairedTTestResults', () => {
  it('groups results by dataset and evaluator', () => {
    const targetScores = [
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 0.8 }),
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval2', score: 0.7 }),
    ];
    const baselineScores = [
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 0.9 }),
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval2', score: 0.75 }),
    ];

    const results = computePairedTTestResults(targetScores, baselineScores);

    expect(results).toHaveLength(2);
    expect(results.map((result) => result.evaluatorName).sort()).toEqual(['eval1', 'eval2']);
  });

  it('computes correct means for each group', () => {
    const targetScores = [
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 0.2 }),
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 0.4, exampleId: 'ex2' }),
    ];
    const baselineScores = [
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 0.6 }),
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 1.0, exampleId: 'ex2' }),
    ];

    const [result] = computePairedTTestResults(targetScores, baselineScores);

    expect(result.meanTarget).toBeCloseTo(0.3, 5);
    expect(result.meanBaseline).toBeCloseTo(0.8, 5);
    expect(result.sampleSize).toBe(2);
  });

  it('returns null p-value when sample size is under 2', () => {
    const targetScores = [createMockScore({ score: 0.8 })];
    const baselineScores = [createMockScore({ score: 0.9 })];

    const [result] = computePairedTTestResults(targetScores, baselineScores);

    expect(result.pValue).toBeNull();
  });

  it('computes p-value for paired differences', () => {
    const targetScores = [
      createMockScore({ exampleId: 'ex1', score: 1 }),
      createMockScore({ exampleId: 'ex2', score: 2 }),
      createMockScore({ exampleId: 'ex3', score: 3 }),
      createMockScore({ exampleId: 'ex4', score: 4 }),
      createMockScore({ exampleId: 'ex5', score: 5 }),
    ];
    const baselineScores = [
      createMockScore({ exampleId: 'ex1', score: 0 }),
      createMockScore({ exampleId: 'ex2', score: 0 }),
      createMockScore({ exampleId: 'ex3', score: 0 }),
      createMockScore({ exampleId: 'ex4', score: 0 }),
      createMockScore({ exampleId: 'ex5', score: 0 }),
    ];

    const [result] = computePairedTTestResults(targetScores, baselineScores);

    expect(result.pValue).not.toBeNull();
    expect(result.pValue as number).toBeCloseTo(0.013, 2);
  });

  it('accepts pre-computed pairs and produces the same results', () => {
    const targetScores = [
      createMockScore({ exampleId: 'ex1', score: 1 }),
      createMockScore({ exampleId: 'ex2', score: 2 }),
      createMockScore({ exampleId: 'ex3', score: 3 }),
      createMockScore({ exampleId: 'ex4', score: 4 }),
      createMockScore({ exampleId: 'ex5', score: 5 }),
    ];
    const baselineScores = [
      createMockScore({ exampleId: 'ex1', score: 0 }),
      createMockScore({ exampleId: 'ex2', score: 0 }),
      createMockScore({ exampleId: 'ex3', score: 0 }),
      createMockScore({ exampleId: 'ex4', score: 0 }),
      createMockScore({ exampleId: 'ex5', score: 0 }),
    ];

    const { pairs } = pairScores(targetScores, baselineScores);
    const fromDocs = computePairedTTestResults(targetScores, baselineScores);
    const fromPairs = computePairedTTestResults(pairs);

    expect(fromPairs).toEqual(fromDocs);
  });

  it('defaults direction via legacy name heuristic when score docs omit the field', () => {
    const quality = computePairedTTestResults(
      [createMockScore({ evaluatorName: 'Correctness', score: 0.8 })],
      [createMockScore({ evaluatorName: 'Correctness', score: 0.9 })]
    );
    expect(quality[0].direction).toBe('maximize');

    const latency = computePairedTTestResults(
      [createMockScore({ evaluatorName: 'Latency', score: 150 })],
      [createMockScore({ evaluatorName: 'Latency', score: 100 })]
    );
    expect(latency[0].direction).toBe('minimize');
  });

  it('propagates direction: maximize from quality evaluator metadata', () => {
    const targetScores = [createMockScore({ score: 0.7, direction: 'maximize' })];
    const baselineScores = [createMockScore({ score: 0.9, direction: 'maximize' })];

    const [result] = computePairedTTestResults(targetScores, baselineScores);

    expect(result.direction).toBe('maximize');
  });

  it('propagates direction: minimize from lower-is-better evaluator metadata', () => {
    const targetScores = [
      createMockScore({ evaluatorName: 'Latency', score: 150, direction: 'minimize' }),
    ];
    const baselineScores = [
      createMockScore({ evaluatorName: 'Latency', score: 100, direction: 'minimize' }),
    ];

    const [result] = computePairedTTestResults(targetScores, baselineScores);

    expect(result.direction).toBe('minimize');
  });

  it('propagates direction: neutral from ambiguous evaluator metadata', () => {
    const targetScores = [
      createMockScore({ evaluatorName: 'Extracted feature count', score: 5, direction: 'neutral' }),
    ];
    const baselineScores = [
      createMockScore({ evaluatorName: 'Extracted feature count', score: 7, direction: 'neutral' }),
    ];

    const [result] = computePairedTTestResults(targetScores, baselineScores);

    expect(result.direction).toBe('neutral');
  });

  it('prefers a defined direction when only one side has the field', () => {
    const targetScores = [
      createMockScore({ evaluatorName: 'Latency', score: 150, direction: 'minimize' }),
    ];
    const baselineScores = [createMockScore({ evaluatorName: 'Latency', score: 100 })];

    const [result] = computePairedTTestResults(targetScores, baselineScores);

    expect(result.direction).toBe('minimize');
  });

  it('uses metadata over the name heuristic for Error handling quality', () => {
    // Legacy regex matches "Error" and would treat this as lower-is-better.
    const targetScores = [
      createMockScore({
        evaluatorName: 'Error handling quality',
        score: 0.4,
        direction: 'maximize',
      }),
    ];
    const baselineScores = [
      createMockScore({
        evaluatorName: 'Error handling quality',
        score: 0.8,
        direction: 'maximize',
      }),
    ];

    const [result] = computePairedTTestResults(targetScores, baselineScores);

    expect(result.direction).toBe('maximize');
  });

  it('legacy name heuristic misclassifies Error handling quality when metadata is absent', () => {
    const [result] = computePairedTTestResults(
      [createMockScore({ evaluatorName: 'Error handling quality', score: 0.4 })],
      [createMockScore({ evaluatorName: 'Error handling quality', score: 0.8 })]
    );

    expect(result.direction).toBe('minimize');
  });
});
