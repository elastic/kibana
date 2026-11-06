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
  // Counters recorded from the pairing by repetition index before the policies existed.
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

      for (const policy of ['mean', 'pool'] as const) {
        const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
          docs(target),
          docs(baseline),
          policy
        );
        expect({ pairs: pairs.length, skippedMissingPairs, skippedNullScores }).toEqual(expected);
      }
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

describe('compareScores (repetitions)', () => {
  it.each(['mean', 'pool'] as const)(
    'keeps the results of one repetition per example (%s)',
    (policy) => {
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

      // Recorded from the pairing by repetition index before the policies existed.
      expect(compareDocs(target, baseline, policy)).toEqual([
        {
          datasetId: 'dataset-1',
          datasetName: 'Dataset 1',
          evaluatorName: 'Pass',
          sampleSize: 4,
          meanTarget: 0.75,
          meanBaseline: 0.25,
          pValue: 0.25,
          direction: 'maximize',
          metricType: 'binary',
          hypothesisTest: {
            id: 'mcnemar',
            method: 'mid-p',
            statistic: 0,
            discordantPairs: { targetOnly: 2, baselineOnly: 0 },
          },
          usedTarget: 4,
          usedBaseline: 4,
          missingTarget: 0,
          missingBaseline: 0,
          stabilityTarget: 0,
          stabilityBaseline: 0,
          repetitionWarning: false,
        },
        {
          datasetId: 'dataset-1',
          datasetName: 'Dataset 1',
          evaluatorName: 'Quality',
          sampleSize: 4,
          meanTarget: 0.8375,
          meanBaseline: 0.35,
          pValue: 0.125,
          direction: 'maximize',
          metricType: 'continuous_bounded',
          hypothesisTest: { id: 'wilcoxon_signed_rank', method: 'exact', statistic: 0 },
          usedTarget: 4,
          usedBaseline: 4,
          missingTarget: 0,
          missingBaseline: 0,
          stabilityTarget: 0,
          stabilityBaseline: 0,
          repetitionWarning: false,
        },
      ]);
    }
  );

  const referenceRepetitions = {
    usedTarget: 17,
    usedBaseline: 17,
    missingTarget: 1,
    missingBaseline: 0,
    stabilityTarget: expect.closeTo(0.05784782328354201, 9),
    stabilityBaseline: expect.closeTo(0.03177176522930781, 9),
    repetitionWarning: true,
  };

  it('tests one pair of repetition means per example under mean', () => {
    const [result] = compareDocs(referenceTarget, referenceBaseline, 'mean');

    expect(result).toMatchObject({
      sampleSize: 6,
      meanTarget: expect.closeTo(0.6472222222222223, 9),
      meanBaseline: expect.closeTo(0.5480555555555556, 9),
      pValue: expect.closeTo(0.0625, 9),
      hypothesisTest: { id: 'wilcoxon_signed_rank', method: 'exact', statistic: 1 },
      ...referenceRepetitions,
    });
  });

  it('pairs every repetition by index under pool, as before the policies existed', () => {
    expect(compareDocs(referenceTarget, referenceBaseline, 'pool')).toEqual([
      {
        datasetId: 'dataset-1',
        datasetName: 'Dataset 1',
        evaluatorName: 'Quality',
        sampleSize: 16,
        meanTarget: 0.634375,
        meanBaseline: 0.543125,
        pValue: 0.003771590323760254,
        direction: 'maximize',
        metricType: 'continuous_bounded',
        hypothesisTest: { id: 'wilcoxon_signed_rank', method: 'asymptotic', statistic: 12 },
        ...referenceRepetitions,
      },
    ]);
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
      usedTarget: 3,
      usedBaseline: 5,
      missingTarget: 2,
      missingBaseline: 0,
      stabilityTarget: expect.closeTo(Math.SQRT1_2 * 0.2, 12),
      stabilityBaseline: 0,
    });
  });

  it('warns when the counts differ per example, even if the totals match, or a score is null', () => {
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

    expect(uneven[0]).toMatchObject({ usedTarget: 5, usedBaseline: 5, repetitionWarning: true });
    expect(nullOnBothSides[0].repetitionWarning).toBe(true);
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
