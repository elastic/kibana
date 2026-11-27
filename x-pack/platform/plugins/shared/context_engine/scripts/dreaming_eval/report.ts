/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoreLine } from './judge';
import { scoreLine } from './judge';
import type { EvalTarget } from './types';

export interface Scores {
  overall: ScoreLine;
  byDataset: Record<string, ScoreLine>;
  byCategory: Record<string, ScoreLine>;
}

/** Scores overall, per dataset and per category of the targets. */
export const scoresOf = <V extends string>(
  results: Array<{ target: EvalTarget; verdict: V }>,
  scores: Record<V, number>
): Scores => {
  const group = (keyOf: (target: EvalTarget) => string): Record<string, ScoreLine> => {
    const groups = new Map<string, V[]>();
    for (const { target, verdict } of results) {
      groups.set(keyOf(target), [...(groups.get(keyOf(target)) ?? []), verdict]);
    }
    return Object.fromEntries(
      [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, verdicts]) => [key, scoreLine(verdicts, scores)])
    );
  };
  return {
    overall: scoreLine(
      results.map(({ verdict }) => verdict),
      scores
    ),
    byDataset: group(({ dataset }) => dataset),
    byCategory: group(({ category }) => category),
  };
};

export const percent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Markdown tables of the scores, a column per verdict. */
export const scoreTables = ({ overall, byDataset, byCategory }: Scores): string[] => {
  const verdicts = Object.keys(overall.counts);
  const table = (title: string, lines: Record<string, ScoreLine>) => [
    `## ${title}`,
    '',
    `| | Targets | ${verdicts.map(capitalize).join(' | ')} | Score |`,
    `| --- | --- | ${verdicts.map(() => '---').join(' | ')} | --- |`,
    ...Object.entries(lines).map(
      ([name, line]) =>
        `| ${name} | ${line.targets} | ${verdicts
          .map((verdict) => line.counts[verdict] ?? 0)
          .join(' | ')} | ${percent(line.score)} |`
    ),
    '',
  ];
  return [
    ...table('Overall', { all: overall }),
    ...table('By dataset', byDataset),
    ...table('By category', byCategory),
  ];
};

/** One line per verdict, for the log. */
export const describeScore = ({ score, targets, counts }: ScoreLine): string =>
  `${percent(score)} (${Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([verdict, count]) => `${count} ${verdict}`)
    .join(', ')} of ${targets})`;

/** The first line of a question, short enough for a list. */
export const shortQuestion = ({ question }: EvalTarget): string =>
  question.split('\n')[0].slice(0, 160);
