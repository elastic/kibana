/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScoreDocument } from '@kbn/evals-common';

const exampleKey = (score: EvaluationScoreDocument): string =>
  [score.example.dataset.id, score.example.id, score.evaluator.name].join('\0');

/**
 * Collapses repetitions to one score per (dataset, example, evaluator): the mean of its finite
 * scores, or null when it has none. Repetitions of one example are not independent samples, so
 * testing them as separate pairs inflates n and understates p-values.
 */
export const averageRepetitions = (
  scores: readonly EvaluationScoreDocument[]
): EvaluationScoreDocument[] => {
  const groups = new Map<string, EvaluationScoreDocument[]>();
  for (const score of scores) {
    const key = exampleKey(score);
    const group = groups.get(key);
    if (group) {
      group.push(score);
    } else {
      groups.set(key, [score]);
    }
  }

  return [...groups.values()].map((group) => {
    const [first] = group;
    if (group.length === 1) return first;
    const finite = group
      .map((score) => score.evaluator.score)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const averaged =
      finite.length > 0 ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
    return {
      ...first,
      task: { ...first.task, repetition_index: 0 },
      evaluator: { ...first.evaluator, score: averaged },
    };
  });
};
