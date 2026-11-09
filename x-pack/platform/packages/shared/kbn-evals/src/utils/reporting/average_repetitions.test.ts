/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScoreDocument } from '@kbn/evals-common';
import { pairScores } from '@kbn/evals-common';
import { averageRepetitions } from './average_repetitions';

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

describe('averageRepetitions', () => {
  it('averages the repetitions of one example into a single score', () => {
    const averaged = averageRepetitions([
      doc({ repetition: 0, score: 1 }),
      doc({ repetition: 1, score: 0 }),
      doc({ repetition: 2, score: 0.5 }),
    ]);

    expect(averaged).toHaveLength(1);
    expect(averaged[0].evaluator.score).toBe(0.5);
    expect(averaged[0].task.repetition_index).toBe(0);
  });

  it('keeps examples and evaluators apart', () => {
    const averaged = averageRepetitions([
      doc({ exampleId: 'ex-1', score: 1 }),
      doc({ exampleId: 'ex-1', repetition: 1, score: 0 }),
      doc({ exampleId: 'ex-2', score: 0.2 }),
      doc({ exampleId: 'ex-1', evaluatorName: 'groundedness', score: 0.9 }),
    ]);

    expect(
      averaged.map((score) => [score.example.id, score.evaluator.name, score.evaluator.score])
    ).toEqual([
      ['ex-1', 'correctness', 0.5],
      ['ex-2', 'correctness', 0.2],
      ['ex-1', 'groundedness', 0.9],
    ]);
  });

  it('ignores null repetitions and is null only when every repetition is', () => {
    const [partial] = averageRepetitions([
      doc({ score: null }),
      doc({ repetition: 1, score: 0.4 }),
    ]);
    const [empty] = averageRepetitions([doc({ score: null }), doc({ repetition: 1, score: null })]);

    expect(partial.evaluator.score).toBe(0.4);
    expect(empty.evaluator.score).toBeNull();
  });

  it('turns 5 examples x 3 repetitions into 5 pairs, not 15', () => {
    const run = (score: number) =>
      [0, 1, 2, 3, 4].flatMap((example) =>
        [0, 1, 2].map((repetition) => doc({ exampleId: `ex-${example}`, repetition, score }))
      );

    expect(pairScores(run(0.9), run(0.8)).pairs).toHaveLength(15);
    expect(
      pairScores(averageRepetitions(run(0.9)), averageRepetitions(run(0.8))).pairs
    ).toHaveLength(5);
  });
});
