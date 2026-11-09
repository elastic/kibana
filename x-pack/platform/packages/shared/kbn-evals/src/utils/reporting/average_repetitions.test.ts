/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScoreDocument } from '@kbn/evals-common';
import { pairScores } from '@kbn/evals-common';
import { averageMatchedRepetitions } from './average_repetitions';

const doc = ({
  exampleId = 'ex-1',
  evaluatorName = 'correctness',
  repetition = 0,
  score,
}: {
  exampleId?: string;
  evaluatorName?: string;
  repetition?: number;
  score: number | null;
}): EvaluationScoreDocument => ({
  '@timestamp': '2026-05-01T11:00:00.000Z',
  experiment_id: 'exp',
  example: { id: exampleId, index: 0, input: {}, dataset: { id: 'ds-1', name: 'Dataset One' } },
  task: {
    trace_id: null,
    repetition_index: repetition,
    output: {},
    model: { id: 'gpt-4', family: 'gpt', provider: 'openai' },
  },
  evaluator: { name: evaluatorName, score, direction: 'maximize' },
  metadata: { execution_id: 'exp', total_repetitions: 3 },
});

const scoresOf = (docs: EvaluationScoreDocument[]) =>
  docs.map((score) => [score.example.id, score.evaluator.name, score.evaluator.score]);

describe('averageMatchedRepetitions', () => {
  it('averages the repetitions of one example into a single score on each side', () => {
    const { target, baseline, trimmedExamples } = averageMatchedRepetitions(
      [
        doc({ repetition: 0, score: 1 }),
        doc({ repetition: 1, score: 0 }),
        doc({ repetition: 2, score: 0.5 }),
      ],
      [
        doc({ repetition: 0, score: 0 }),
        doc({ repetition: 1, score: 0 }),
        doc({ repetition: 2, score: 0.3 }),
      ]
    );

    expect(target).toHaveLength(1);
    expect(target[0].evaluator.score).toBe(0.5);
    expect(target[0].task.repetition_index).toBe(0);
    expect(baseline[0].evaluator.score).toBeCloseTo(0.1);
    expect(trimmedExamples).toBe(0);
  });

  it('keeps examples and evaluators apart', () => {
    const run = [
      doc({ exampleId: 'ex-1', score: 1 }),
      doc({ exampleId: 'ex-1', repetition: 1, score: 0 }),
      doc({ exampleId: 'ex-2', score: 0.2 }),
      doc({ exampleId: 'ex-1', evaluatorName: 'groundedness', score: 0.9 }),
    ];

    expect(scoresOf(averageMatchedRepetitions(run, run).target)).toEqual([
      ['ex-1', 'correctness', 0.5],
      ['ex-2', 'correctness', 0.2],
      ['ex-1', 'groundedness', 0.9],
    ]);
  });

  it('averages both sides over the repetition count they share', () => {
    // 3 repetitions against 1: a mean of 3 against a single score would skew the differences.
    const { target, baseline, trimmedExamples } = averageMatchedRepetitions(
      [
        doc({ repetition: 2, score: 0 }),
        doc({ repetition: 0, score: 1 }),
        doc({ repetition: 1, score: 0 }),
      ],
      [doc({ repetition: 0, score: 1 })]
    );

    expect(target[0].evaluator.score).toBe(1);
    expect(baseline[0].evaluator.score).toBe(1);
    expect(trimmedExamples).toBe(1);
  });

  it('counts only finite repetitions when matching, and is null when none are left', () => {
    const { target, baseline } = averageMatchedRepetitions(
      [
        doc({ score: null }),
        doc({ repetition: 1, score: 0.4 }),
        doc({ repetition: 2, score: 0.6 }),
      ],
      [doc({ score: 0.8 }), doc({ repetition: 1, score: null })]
    );
    const empty = averageMatchedRepetitions(
      [doc({ score: null }), doc({ repetition: 1, score: null })],
      [doc({ score: 0.5 })]
    );

    expect(target[0].evaluator.score).toBe(0.4);
    expect(baseline[0].evaluator.score).toBe(0.8);
    expect(empty.target[0].evaluator.score).toBeNull();
    expect(empty.baseline[0].evaluator.score).toBe(0.5);
  });

  it('keeps an unmatched example averaged over all its repetitions', () => {
    const { target, trimmedExamples } = averageMatchedRepetitions(
      [
        doc({ exampleId: 'only-here', score: 1 }),
        doc({ exampleId: 'only-here', repetition: 1, score: 0 }),
      ],
      [doc({ score: 1 })]
    );

    expect(scoresOf(target)).toEqual([['only-here', 'correctness', 0.5]]);
    expect(trimmedExamples).toBe(0);
  });

  it('gives the same mean for the same values in a different repetition order', () => {
    // (0.1 + 0.2 + 0.3) / 3 !== (0.3 + 0.2 + 0.1) / 3 in floating point.
    const forward = [0.1, 0.2, 0.3].map((score, repetition) => doc({ repetition, score }));
    const reversed = [0.3, 0.2, 0.1].map((score, repetition) => doc({ repetition, score }));

    const { target, baseline } = averageMatchedRepetitions(forward, reversed);

    expect(target[0].evaluator.score).toBe(baseline[0].evaluator.score);
  });

  it('pairs an example whose only surviving repetition differs between the runs', () => {
    const { target, baseline } = averageMatchedRepetitions(
      [doc({ repetition: 2, score: 0.4 })],
      [doc({ repetition: 0, score: 0.8 })]
    );

    expect(pairScores(target, baseline).pairs).toHaveLength(1);
  });

  it('turns 5 examples x 3 repetitions into 5 pairs, not 15', () => {
    const run = (score: number) =>
      [0, 1, 2, 3, 4].flatMap((example) =>
        [0, 1, 2].map((repetition) => doc({ exampleId: `ex-${example}`, repetition, score }))
      );

    const { target, baseline } = averageMatchedRepetitions(run(0.9), run(0.8));

    expect(pairScores(run(0.9), run(0.8)).pairs).toHaveLength(15);
    expect(pairScores(target, baseline).pairs).toHaveLength(5);
  });
});
