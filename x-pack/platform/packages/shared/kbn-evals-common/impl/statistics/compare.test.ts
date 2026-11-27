/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Direction, EvaluationScoreDocument } from '../schemas/common_attributes.gen';
import type { RepetitionPolicy } from '../schemas/experiments/compare_experiments_route.gen';
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

const compareDocs = (
  target: EvaluationScoreDocument[],
  baseline: EvaluationScoreDocument[],
  policy: RepetitionPolicy = 'mean'
) => {
  const { pairs, repetitions } = pairScores(target, baseline, policy);
  return compareScores(pairs, repetitions);
};

// One example per side and evaluator; each row lists the scores of its repetitions.
const scoresPerExample = (
  rows: Array<Array<number | null>>,
  evaluatorName = 'Quality'
): EvaluationScoreDocument[] =>
  rows.flatMap((scores, example) =>
    scores.map((score, repetitionIndex) =>
      createMockScore({ exampleId: `ex-${example + 1}`, evaluatorName, repetitionIndex, score })
    )
  );

// Six examples with up to three repetitions: one null target score and one absent baseline
// repetition. The expected numbers were computed with scipy.
const referenceTarget = scoresPerExample([
  [0.9, 0.8, null],
  [0.6, 0.7, 0.65],
  [0.4, 0.5, 0.45],
  [0.95, 0.9, 0.85],
  [0.3, 0.35, 0.2],
  [0.75, 0.7, 0.8],
]);
const referenceBaseline = scoresPerExample([
  [0.7, 0.6, 0.65],
  [0.55, 0.5],
  [0.42, 0.38, 0.4],
  [0.8, 0.85, 0.75],
  [0.33, 0.3, 0.31],
  [0.6, 0.62, 0.58],
]);

describe('pairScores', () => {
  // Counters recorded before repetitions were aggregated.
  // `v` is a valid score, `n` a null score and `-` no document.
  it.each([
    ['v', 'v', { pairs: 1, skippedMissingPairs: 0, skippedNullScores: 0 }],
    ['v', 'n', { pairs: 0, skippedMissingPairs: 1, skippedNullScores: 1 }],
    ['v', '-', { pairs: 0, skippedMissingPairs: 1, skippedNullScores: 0 }],
    ['n', 'v', { pairs: 0, skippedMissingPairs: 0, skippedNullScores: 1 }],
    ['n', 'n', { pairs: 0, skippedMissingPairs: 0, skippedNullScores: 2 }],
    ['n', '-', { pairs: 0, skippedMissingPairs: 0, skippedNullScores: 1 }],
    ['-', 'v', { pairs: 0, skippedMissingPairs: 1, skippedNullScores: 0 }],
    ['-', 'n', { pairs: 0, skippedMissingPairs: 0, skippedNullScores: 1 }],
  ])(
    'keeps the counters of one repetition per example (target %s, baseline %s)',
    (target, baseline, expected) => {
      const docs = (side: string) =>
        side === '-' ? [] : [createMockScore({ score: side === 'v' ? 0.5 : null })];

      const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
        docs(target),
        docs(baseline),
        'mean'
      );
      expect({ pairs: pairs.length, skippedMissingPairs, skippedNullScores }).toEqual(expected);
    }
  );

  it('rejects median slices with a score outside [0, 1] and keeps the others', () => {
    const target = [
      ...scoresPerExample([[0.2, 0.4, 0.9]]),
      ...scoresPerExample([[1.5, 1.2, 1.1]], 'Latency'),
    ];
    const baseline = [
      ...scoresPerExample([[0.3, 0.1]]),
      ...scoresPerExample([[1.0, 0.9, 0.8]], 'Latency'),
    ];

    const median = pairScores(target, baseline, 'median');
    expect(median.pairs).toEqual([
      expect.objectContaining({ evaluatorName: 'Quality', scoreTarget: 0.4, scoreBaseline: 0.2 }),
    ]);
    expect(median.rejectedSlices).toEqual([{ datasetName: 'Dataset 1', evaluatorName: 'Latency' }]);

    const mean = pairScores(target, baseline, 'mean');
    expect(mean.pairs.map((pair) => pair.evaluatorName)).toEqual(['Quality', 'Latency']);
    expect(mean.rejectedSlices).toEqual([]);
  });

  it('pairs the scores of an example whatever their repetition index', () => {
    const target = [createMockScore({ repetitionIndex: 1, score: 0.8 })];
    const baseline = [createMockScore({ repetitionIndex: 0, score: 0.2 })];

    expect(pairScores(target, baseline, 'mean').pairs).toEqual([
      expect.objectContaining({ scoreTarget: 0.8, scoreBaseline: 0.2 }),
    ]);
  });

  it('averages an example held twice', () => {
    const target = [createMockScore({ score: 0.8 }), createMockScore({ score: 0.4 })];
    const baseline = [createMockScore({ score: 0.2 }), createMockScore({ score: 0.6 })];

    expect(pairScores(target, baseline, 'mean').pairs).toEqual([
      expect.objectContaining({
        scoreTarget: expect.closeTo(0.6, 12),
        scoreBaseline: expect.closeTo(0.4, 12),
      }),
    ]);
  });
});

describe('compareScores', () => {
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

    const results = compareDocs(target, baseline);

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

    const [result] = compareDocs(docs(targetScores), docs(baselineScores));

    expect(result.metricType).toBe('continuous_bounded');
    expect(result.hypothesisTest.id).toBe('paired_t');
    expect(result.hypothesisTest.method).toBeUndefined();
    expect(result.pValue).toBeCloseTo(2.795687139010667e-10, 15);
  });

  it('reports statistic and metric type', () => {
    const target = docs([0.2, 0.4, 0.9]);
    const baseline = docs([0.6, 1.0, 0.1]);

    const [result] = compareDocs(target, baseline);

    expect(result.hypothesisTest.statistic).not.toBeNull();
    expect(result.metricType).toBe('continuous_bounded');
    expect(result.hypothesisTest.discordantPairs).toBeUndefined();
  });

  it('attaches discordant pairs to binary slices', () => {
    const target = docs([1, 1, 1, 0, 0, 1]);
    const baseline = docs([0, 1, 0, 1, 0, 1]);

    const [result] = compareDocs(target, baseline);

    expect(result.metricType).toBe('binary');
    expect(result.hypothesisTest.discordantPairs).toEqual({ targetOnly: 2, baselineOnly: 1 });
  });

  it('runs Wilcoxon on a single pair', () => {
    const [result] = compareDocs(
      [createMockScore({ score: 0.8 })],
      [createMockScore({ score: 0.9 })]
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

    const results = compareDocs(target, baseline);

    expect(results.map((result) => `${result.datasetId}|${result.evaluatorName}`)).toEqual([
      'dataset-1|A',
      'dataset-1|B',
      'ds2|A',
    ]);
  });
});

describe('compareScores (grouping, means and direction)', () => {
  const compare = (target: EvaluationScoreDocument[], baseline: EvaluationScoreDocument[]) =>
    compareDocs(target, baseline);

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

    expect(result.target.mean).toBeCloseTo(0.3, 5);
    expect(result.baseline.mean).toBeCloseTo(0.8, 5);
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
      results.map(({ evaluatorName, direction, target, baseline }) => ({
        evaluatorName,
        direction,
        improved: isImproved(target.mean - baseline.mean, direction),
      }))
    ).toEqual([
      { evaluatorName: 'answer-quality.grounded', direction: 'maximize', improved: true },
      { evaluatorName: 'answer-quality.hallucination', direction: 'minimize', improved: true },
    ]);
  });
});

describe('compareScores (repetitions)', () => {
  it('keeps the results of one repetition per example', () => {
    const oneRepetition = (scores: number[], evaluatorName: string) =>
      scoresPerExample(
        scores.map((score) => [score]),
        evaluatorName
      );
    const target = [
      ...oneRepetition([1, 1, 1, 0], 'Pass'),
      ...oneRepetition([0.9, 0.8, 0.7, 0.95], 'Quality'),
    ];
    // The baseline order must not change the order of the rows.
    const baseline = [
      ...oneRepetition([0, 1, 0, 0], 'Pass'),
      ...oneRepetition([0.5, 0.4, 0.3, 0.2], 'Quality'),
    ].reverse();

    // Recorded before repetitions were aggregated.
    expect(compareDocs(target, baseline)).toEqual([
      {
        datasetId: 'dataset-1',
        datasetName: 'Dataset 1',
        evaluatorName: 'Pass',
        sampleSize: 4,
        target: { mean: 0.75, used: 4, missing: 0, stability: null },
        baseline: { mean: 0.25, used: 4, missing: 0, stability: null },
        pValue: 0.25,
        direction: 'maximize',
        metricType: 'binary',
        hypothesisTest: {
          id: 'mcnemar',
          method: 'mid-p',
          statistic: 0,
          discordantPairs: { targetOnly: 2, baselineOnly: 0 },
        },
        repetitionWarning: false,
      },
      {
        datasetId: 'dataset-1',
        datasetName: 'Dataset 1',
        evaluatorName: 'Quality',
        sampleSize: 4,
        target: { mean: 0.8375, used: 4, missing: 0, stability: null },
        baseline: { mean: 0.35, used: 4, missing: 0, stability: null },
        pValue: 0.125,
        direction: 'maximize',
        metricType: 'continuous_bounded',
        hypothesisTest: { id: 'wilcoxon_signed_rank', method: 'exact', statistic: 0 },
        repetitionWarning: false,
      },
    ]);
  });

  it('tests one pair of repetition means per example under mean', () => {
    const [result] = compareDocs(referenceTarget, referenceBaseline, 'mean');

    expect(result).toMatchObject({
      sampleSize: 6,
      pValue: expect.closeTo(0.0625, 9),
      hypothesisTest: { id: 'wilcoxon_signed_rank', method: 'exact', statistic: 1 },
      target: {
        mean: expect.closeTo(0.6472222222222223, 9),
        used: 17,
        missing: 1,
        stability: expect.closeTo(0.05784782328354201, 9),
      },
      baseline: {
        mean: expect.closeTo(0.5480555555555556, 9),
        used: 17,
        missing: 0,
        stability: expect.closeTo(0.03177176522930781, 9),
      },
      repetitionWarning: true,
    });
  });

  it('leaves unpaired examples and single values out of the stability only', () => {
    const target = scoresPerExample([[null, null], [0.2, 0.4], [0.7]]);
    const baseline = scoresPerExample([[0.5, 0.9], [0.1, 0.1], [0.3]]);

    const { pairs, repetitions, skippedMissingPairs, skippedNullScores } = pairScores(
      target,
      baseline,
      'mean'
    );
    const [result] = compareScores(pairs, repetitions);

    expect({ skippedMissingPairs, skippedNullScores }).toEqual({
      skippedMissingPairs: 0,
      skippedNullScores: 2,
    });
    expect(result).toMatchObject({
      sampleSize: 2,
      target: { used: 3, missing: 2, stability: expect.closeTo(Math.SQRT1_2 * 0.2, 12) },
      baseline: { used: 5, missing: 0, stability: 0 },
    });
  });

  it('warns when the counts differ per example, a score is null or an example is on one side only', () => {
    const uneven = compareDocs(
      scoresPerExample([
        [0.1, 0.2, 0.3],
        [0.4, 0.5],
      ]),
      scoresPerExample([
        [0.1, 0.2],
        [0.4, 0.5, 0.6],
      ])
    );
    const nullOnBothSides = compareDocs(
      scoresPerExample([[0.1, null]]),
      scoresPerExample([[0.2, null]])
    );

    expect(uneven[0]).toMatchObject({
      target: { used: 5 },
      baseline: { used: 5 },
      repetitionWarning: true,
    });
    expect(nullOnBothSides[0].repetitionWarning).toBe(true);

    // An example on one side only counts as 0 valid repetitions against n.
    const oneSideOnly = compareDocs(scoresPerExample([[0.1], [0.4]]), scoresPerExample([[0.2]]));
    expect(oneSideOnly[0]).toMatchObject({ sampleSize: 1, repetitionWarning: true });
  });

  it('treats averaged whole-number scores as continuous', () => {
    const [result] = compareDocs(
      scoresPerExample([
        [4, 5],
        [3, 3],
        [2, 4],
        [5, 5],
        [1, 2],
        [3, 4],
      ]),
      scoresPerExample([
        [3, 4],
        [2, 3],
        [2, 2],
        [4, 5],
        [1, 1],
        [3, 3],
      ])
    );

    expect(result.metricType).toBe('continuous_unbounded');
  });

  it('never passes averaged pass/fail scores to McNemar', () => {
    const target = scoresPerExample(
      [
        [1, 1, 0],
        [1, 1, 1],
        [0, 1, 0],
        [1, 0, 1],
        [1, 1, 1],
        [0, 0, 1],
      ],
      'Pass'
    );
    const baseline = scoresPerExample(
      [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
      ],
      'Pass'
    );
    const unanimous = (rows: number[]) =>
      scoresPerExample(
        rows.map((score) => [score, score]),
        'Unanimous'
      );

    const [averaged, agreed] = compareDocs(
      [...target, ...unanimous([1, 1, 0, 1])],
      [...baseline, ...unanimous([0, 1, 0, 0])]
    );

    expect(averaged.metricType).toBe('continuous_bounded');
    expect(averaged.hypothesisTest.id).toBe('wilcoxon_signed_rank');
    expect(averaged.hypothesisTest.discordantPairs).toBeUndefined();
    expect(agreed.metricType).toBe('binary');
    expect(agreed.hypothesisTest.id).toBe('mcnemar');
  });
});
