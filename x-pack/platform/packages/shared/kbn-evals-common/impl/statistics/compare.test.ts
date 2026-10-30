/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Direction, EvaluationScoreDocument } from '../schemas/common_attributes.gen';
import { compareScores } from './compare';
import { isImproved, pairScores } from './pairing';

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

describe('compareScores', () => {
  const pairDocs = (target: EvaluationScoreDocument[], baseline: EvaluationScoreDocument[]) =>
    pairScores(target, baseline).pairs;

  const docs = (scores: number[]) =>
    scores.map((score, index) => createMockScore({ exampleId: `ex-${index}`, score }));

  it('selects the test per slice from the inferred metric type', () => {
    const target = [
      ...[1, 1, 1, 0].map((score, index) =>
        createMockScore({ evaluatorName: 'Pass', exampleId: `ex-${index}`, score })
      ),
      ...[0.9, 0.8, 0.7, 0.95].map((score, index) =>
        createMockScore({ evaluatorName: 'Quality', exampleId: `ex-${index}`, score })
      ),
    ];
    const baseline = [
      ...[0, 1, 0, 0].map((score, index) =>
        createMockScore({ evaluatorName: 'Pass', exampleId: `ex-${index}`, score })
      ),
      ...[0.5, 0.4, 0.3, 0.2].map((score, index) =>
        createMockScore({ evaluatorName: 'Quality', exampleId: `ex-${index}`, score })
      ),
    ];

    const results = compareScores(pairDocs(target, baseline));

    expect(
      results.map(({ evaluatorName, metricType, hypothesisTest }) => ({
        evaluatorName,
        metricType,
        id: hypothesisTest.id,
        method: hypothesisTest.method,
      }))
    ).toEqual([
      { evaluatorName: 'Pass', metricType: 'binary', id: 'mcnemar', method: 'mid-p' },
      {
        evaluatorName: 'Quality',
        metricType: 'continuous_bounded',
        id: 'wilcoxon_signed_rank',
        method: 'exact',
      },
    ]);
  });

  it('upgrades a large normal-looking continuous slice to paired t', () => {
    const differences = [-3, -2, -2, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 3].flatMap(
      (value) => [value * 0.01 + 0.02, value * 0.011 + 0.021]
    );
    const baselineScores = Array.from({ length: 40 }, (_, index) => 0.5 + (index % 7) * 0.03);
    const targetScores = baselineScores.map((value, index) => value + differences[index]);

    const [result] = compareScores(pairDocs(docs(targetScores), docs(baselineScores)));

    expect(result.metricType).toBe('continuous_bounded');
    expect(result.hypothesisTest.id).toBe('paired_t');
    expect(result.hypothesisTest.method).toBeUndefined();
    expect(result.pValue).toBeCloseTo(2.022935136447288e-10, 15);
  });

  it('reports statistic and metric type', () => {
    const target = docs([0.2, 0.4, 0.9]);
    const baseline = docs([0.6, 1.0, 0.1]);

    const [result] = compareScores(pairDocs(target, baseline));

    expect(result.hypothesisTest.statistic).not.toBeNull();
    expect(result.metricType).toBe('continuous_bounded');
    expect(result.hypothesisTest.discordantPairs).toBeUndefined();
  });

  it('attaches discordant pairs to binary slices', () => {
    const target = docs([1, 1, 1, 0, 0, 1]);
    const baseline = docs([0, 1, 0, 1, 0, 1]);

    const [result] = compareScores(pairDocs(target, baseline));

    expect(result.metricType).toBe('binary');
    expect(result.hypothesisTest.discordantPairs).toEqual({ targetOnly: 2, baselineOnly: 1 });
  });

  it('runs Wilcoxon on a single pair', () => {
    const [result] = compareScores(
      pairDocs([createMockScore({ score: 0.8 })], [createMockScore({ score: 0.9 })])
    );

    expect(result.hypothesisTest.id).toBe('wilcoxon_signed_rank');
    expect(result.pValue).toBe(1);
  });

  it('produces one row per dataset and evaluator', () => {
    const target = [
      createMockScore({ evaluatorName: 'A', exampleId: 'ex-1', score: 1 }),
      createMockScore({ evaluatorName: 'B', exampleId: 'ex-1', score: 0.4 }),
      createMockScore({ datasetId: 'ds2', evaluatorName: 'A', exampleId: 'ex-1', score: 0 }),
    ];
    const baseline = [
      createMockScore({ evaluatorName: 'A', exampleId: 'ex-1', score: 0 }),
      createMockScore({ evaluatorName: 'B', exampleId: 'ex-1', score: 0.5 }),
      createMockScore({ datasetId: 'ds2', evaluatorName: 'A', exampleId: 'ex-1', score: 1 }),
    ];

    const results = compareScores(pairDocs(target, baseline));

    expect(results.map((result) => `${result.datasetId}|${result.evaluatorName}`)).toEqual([
      'dataset-1|A',
      'dataset-1|B',
      'ds2|A',
    ]);
  });
});

describe('compareScores (grouping, means and direction)', () => {
  const compare = (target: EvaluationScoreDocument[], baseline: EvaluationScoreDocument[]) =>
    compareScores(pairScores(target, baseline).pairs);

  it('groups results by dataset and evaluator', () => {
    const targetScores = [
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 0.8 }),
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval2', score: 0.7 }),
    ];
    const baselineScores = [
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval1', score: 0.9 }),
      createMockScore({ datasetId: 'ds1', evaluatorName: 'eval2', score: 0.75 }),
    ];

    const results = compare(targetScores, baselineScores);

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

    const [result] = compare(targetScores, baselineScores);

    expect(result.meanTarget).toBeCloseTo(0.3, 5);
    expect(result.meanBaseline).toBeCloseTo(0.8, 5);
    expect(result.sampleSize).toBe(2);
  });

  it('defaults direction via legacy name heuristic when score docs omit the field', () => {
    const quality = compare(
      [createMockScore({ evaluatorName: 'Correctness', score: 0.8 })],
      [createMockScore({ evaluatorName: 'Correctness', score: 0.9 })]
    );
    expect(quality[0].direction).toBe('maximize');

    const latency = compare(
      [createMockScore({ evaluatorName: 'Latency', score: 150 })],
      [createMockScore({ evaluatorName: 'Latency', score: 100 })]
    );
    expect(latency[0].direction).toBe('minimize');
  });

  it('propagates direction: maximize from quality evaluator metadata', () => {
    const targetScores = [createMockScore({ score: 0.7, direction: 'maximize' })];
    const baselineScores = [createMockScore({ score: 0.9, direction: 'maximize' })];

    const [result] = compare(targetScores, baselineScores);

    expect(result.direction).toBe('maximize');
  });

  it('propagates direction: minimize from lower-is-better evaluator metadata', () => {
    const targetScores = [
      createMockScore({ evaluatorName: 'Latency', score: 150, direction: 'minimize' }),
    ];
    const baselineScores = [
      createMockScore({ evaluatorName: 'Latency', score: 100, direction: 'minimize' }),
    ];

    const [result] = compare(targetScores, baselineScores);

    expect(result.direction).toBe('minimize');
  });

  it('propagates direction: neutral from ambiguous evaluator metadata', () => {
    const targetScores = [
      createMockScore({ evaluatorName: 'Extracted feature count', score: 5, direction: 'neutral' }),
    ];
    const baselineScores = [
      createMockScore({ evaluatorName: 'Extracted feature count', score: 7, direction: 'neutral' }),
    ];

    const [result] = compare(targetScores, baselineScores);

    expect(result.direction).toBe('neutral');
  });

  it('prefers a defined direction when only one side has the field', () => {
    const targetScores = [
      createMockScore({ evaluatorName: 'Latency', score: 150, direction: 'minimize' }),
    ];
    const baselineScores = [createMockScore({ evaluatorName: 'Latency', score: 100 })];

    const [result] = compare(targetScores, baselineScores);

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

    const [result] = compare(targetScores, baselineScores);

    expect(result.direction).toBe('maximize');
  });

  it('legacy name heuristic misclassifies Error handling quality when metadata is absent', () => {
    const [result] = compare(
      [createMockScore({ evaluatorName: 'Error handling quality', score: 0.4 })],
      [createMockScore({ evaluatorName: 'Error handling quality', score: 0.8 })]
    );

    expect(result.direction).toBe('minimize');
  });

  it("keeps each score's direction when one evaluator's scores point different ways", () => {
    const scoresFor = (grounded: number, hallucination: number) => [
      createMockScore({
        evaluatorName: 'answer-quality.grounded',
        score: grounded,
        direction: 'maximize',
      }),
      createMockScore({
        evaluatorName: 'answer-quality.hallucination',
        score: hallucination,
        direction: 'minimize',
      }),
    ];

    const results = compare(scoresFor(0.9, 0.1), scoresFor(0.6, 0.4));

    expect(
      results.map(({ evaluatorName, direction, meanTarget, meanBaseline }) => ({
        evaluatorName,
        direction,
        improved: isImproved(meanTarget - meanBaseline, direction),
      }))
    ).toEqual([
      { evaluatorName: 'answer-quality.grounded', direction: 'maximize', improved: true },
      { evaluatorName: 'answer-quality.hallucination', direction: 'minimize', improved: true },
    ]);
  });
});
