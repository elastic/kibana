/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScoreDocument } from '../schemas/common_attributes.gen';

const exampleKey = (score: EvaluationScoreDocument): string =>
  [score.example.dataset.id, score.example.id, score.evaluator.name].join('\0');

const isFiniteScore = (score: EvaluationScoreDocument): boolean =>
  typeof score.evaluator.score === 'number' && Number.isFinite(score.evaluator.score);

const groupByExample = (
  scores: readonly EvaluationScoreDocument[]
): Map<string, EvaluationScoreDocument[]> => {
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
  return groups;
};

const finiteByRepetition = (group: readonly EvaluationScoreDocument[]): EvaluationScoreDocument[] =>
  group.filter(isFiniteScore).sort((a, b) => a.task.repetition_index - b.task.repetition_index);

// Summed in sorted order so the same values give the same mean whatever order the docs came in.
const mean = (values: number[]): number =>
  [...values].sort((a, b) => a - b).reduce((sum, value) => sum + value, 0) / values.length;

// Every collapsed doc gets index 0: pairScores still keys on it, and a surviving repetition 2 on
// one side must pair with repetition 0 on the other.
const collapse = (
  group: readonly EvaluationScoreDocument[],
  used: readonly EvaluationScoreDocument[]
): EvaluationScoreDocument => {
  const [first] = group;
  return {
    ...first,
    task: { ...first.task, repetition_index: 0 },
    evaluator: {
      ...first.evaluator,
      score: used.length > 0 ? mean(used.map((score) => score.evaluator.score as number)) : null,
    },
  };
};

export interface AveragedRepetitions {
  target: EvaluationScoreDocument[];
  baseline: EvaluationScoreDocument[];
  /** Examples where one side had more usable repetitions and its extra ones were left out. */
  trimmedExamples: number;
}

/**
 * Collapses repetitions to one score per (dataset, example, evaluator) on each side, so an example
 * is one pair rather than one pair per repetition: repetitions of one example are not independent,
 * and counting them separately inflates n and understates p-values.
 *
 * Both sides of an example average the same number of repetitions (the lowest-indexed finite ones,
 * up to the smaller side's count). A mean of 3 scores against a single score has a skewed
 * difference even when nothing changed, and the signed-rank test reads that skew as a shift.
 */
export const averageMatchedRepetitions = (
  targetScores: readonly EvaluationScoreDocument[],
  baselineScores: readonly EvaluationScoreDocument[]
): AveragedRepetitions => {
  const targetGroups = groupByExample(targetScores);
  const baselineGroups = groupByExample(baselineScores);
  const finiteCount = (groups: Map<string, EvaluationScoreDocument[]>, key: string): number =>
    groups.get(key)?.filter(isFiniteScore).length ?? 0;

  // An example with no usable score on the other side is skipped by pairScores anyway, so it keeps
  // its own average and the skip counts stay what they were.
  const side = (
    groups: Map<string, EvaluationScoreDocument[]>,
    other: Map<string, EvaluationScoreDocument[]>
  ): EvaluationScoreDocument[] =>
    [...groups].map(([key, group]) => {
      const finite = finiteByRepetition(group);
      const otherCount = finiteCount(other, key);
      const count = otherCount > 0 ? Math.min(finite.length, otherCount) : finite.length;
      return collapse(group, finite.slice(0, count));
    });

  const trimmedExamples = [...targetGroups.keys()].filter((key) => {
    const targetCount = finiteCount(targetGroups, key);
    const baselineCount = finiteCount(baselineGroups, key);
    return targetCount > 0 && baselineCount > 0 && targetCount !== baselineCount;
  }).length;

  return {
    target: side(targetGroups, baselineGroups),
    baseline: side(baselineGroups, targetGroups),
    trimmedExamples,
  };
};
