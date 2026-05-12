/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompositeScoreResult } from '../types';

export interface ComparisonRunInput {
  runId: string;
  label?: string;
  evaluatorResults: Array<{
    name: string;
    score: number | null;
  }>;
  compositeScore?: CompositeScoreResult;
}

export interface EvaluatorDelta {
  evaluator: string;
  scoreA: number | null;
  scoreB: number | null;
  delta: number | null;
  flag: 'regression' | 'improvement' | 'unchanged' | 'unavailable';
}

export interface ComparisonReport {
  markdown: string;
  deltas: EvaluatorDelta[];
  winner: 'A' | 'B' | 'tie';
}

const REGRESSION_THRESHOLD = 0.05;
const EPSILON = 1e-9;

const formatScore = (score: number | null): string => {
  if (score === null) return 'N/A';
  return (score * 100).toFixed(1) + '%';
};

const formatDelta = (delta: number | null): string => {
  if (delta === null) return '-';
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${(delta * 100).toFixed(1)}%`;
};

const flagEmoji = (flag: EvaluatorDelta['flag']): string => {
  switch (flag) {
    case 'improvement':
      return '📈';
    case 'regression':
      return '📉';
    case 'unchanged':
      return '➡️';
    case 'unavailable':
      return '❓';
  }
};

/**
 * Generates a side-by-side comparison report between two evaluation runs.
 */
export const generateComparisonReport = (
  runA: ComparisonRunInput,
  runB: ComparisonRunInput
): ComparisonReport => {
  const allEvaluators = new Set([
    ...runA.evaluatorResults.map((r) => r.name),
    ...runB.evaluatorResults.map((r) => r.name),
  ]);

  const deltas: EvaluatorDelta[] = [];

  for (const evaluator of allEvaluators) {
    const resultA = runA.evaluatorResults.find((r) => r.name === evaluator);
    const resultB = runB.evaluatorResults.find((r) => r.name === evaluator);
    const scoreA = resultA?.score ?? null;
    const scoreB = resultB?.score ?? null;

    let delta: number | null = null;
    let flag: EvaluatorDelta['flag'] = 'unavailable';

    if (scoreA !== null && scoreB !== null) {
      delta = scoreB - scoreA;
      if (delta > REGRESSION_THRESHOLD + EPSILON) {
        flag = 'improvement';
      } else if (delta < -(REGRESSION_THRESHOLD + EPSILON)) {
        flag = 'regression';
      } else {
        flag = 'unchanged';
      }
    }

    deltas.push({ evaluator, scoreA, scoreB, delta, flag });
  }

  // Determine winner
  const improvements = deltas.filter((d) => d.flag === 'improvement').length;
  const regressions = deltas.filter((d) => d.flag === 'regression').length;

  let winner: 'A' | 'B' | 'tie';
  if (improvements > regressions) {
    winner = 'B';
  } else if (regressions > improvements) {
    winner = 'A';
  } else {
    winner = 'tie';
  }

  // Build markdown
  const lines: string[] = [];
  const labelA = runA.label ?? runA.runId;
  const labelB = runB.label ?? runB.runId;

  lines.push(`# Comparison: ${labelA} vs ${labelB}`);
  lines.push('');

  // Composite scores if available
  if (runA.compositeScore && runB.compositeScore) {
    const compositeDelta = runB.compositeScore.compositeScore - runA.compositeScore.compositeScore;
    lines.push(
      `**Composite:** ${formatScore(runA.compositeScore.compositeScore)} (${
        runA.compositeScore.compositeGrade
      }) → ${formatScore(runB.compositeScore.compositeScore)} (${
        runB.compositeScore.compositeGrade
      }) [${formatDelta(compositeDelta)}]`
    );
    lines.push('');
  }

  // Winner
  const winnerLabel = winner === 'A' ? labelA : winner === 'B' ? labelB : 'Tie';
  lines.push(
    `**Winner:** ${winnerLabel} (${improvements} improvements, ${regressions} regressions)`
  );
  lines.push('');

  // Per-evaluator table
  lines.push('## Per-Evaluator Comparison');
  lines.push('');
  lines.push(`| Evaluator | ${labelA} | ${labelB} | Delta | Flag |`);
  lines.push('| --- | --- | --- | --- | --- |');

  for (const d of deltas) {
    lines.push(
      `| ${d.evaluator} | ${formatScore(d.scoreA)} | ${formatScore(d.scoreB)} | ${formatDelta(
        d.delta
      )} | ${flagEmoji(d.flag)} ${d.flag} |`
    );
  }

  lines.push('');

  // Summary counts
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Improvements (>5%): ${improvements}`);
  lines.push(`- Regressions (>5%): ${regressions}`);
  lines.push(`- Unchanged: ${deltas.filter((d) => d.flag === 'unchanged').length}`);
  lines.push(`- Unavailable: ${deltas.filter((d) => d.flag === 'unavailable').length}`);

  return {
    markdown: lines.join('\n'),
    deltas,
    winner,
  };
};
