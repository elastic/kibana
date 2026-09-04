/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gammaln, mean, tTest } from 'simple-statistics';
import type { Direction, EvaluationScoreDocument } from './schemas/common_attributes.gen';
import type { PairedTTestResult } from './schemas/experiments/compare_experiments_route.gen';

export type { Direction };

export interface PairedScore {
  datasetId: string;
  datasetName: string;
  evaluatorName: string;
  scoreTarget: number;
  scoreBaseline: number;
  direction?: Direction;
}

/**
 * Legacy name→polarity heuristic used before `evaluator.direction` was persisted.
 * Kept only as a fallback for historical score docs that omit the field.
 */
const LOWER_IS_BETTER_NAME_PATTERN = /\b(tokens?|latency|costs?|duration|time|errors?)\b/i;

function resolveDirectionFromEvaluatorName(evaluatorName: string): Direction {
  return LOWER_IS_BETTER_NAME_PATTERN.test(evaluatorName) ? 'minimize' : 'maximize';
}

/**
 * Resolve metric polarity for a paired baseline/target comparison of the same evaluator.
 * - Both missing: legacy name-based heuristic (backward compatible with pre-metadata scores)
 * - Only one side defined: use that side
 * - Both defined: prefer target
 */
export function resolveDirection(
  targetDirection: Direction | undefined,
  baselineDirection: Direction | undefined,
  evaluatorName: string
): Direction {
  if (targetDirection !== undefined) {
    return targetDirection;
  }
  if (baselineDirection !== undefined) {
    return baselineDirection;
  }
  return resolveDirectionFromEvaluatorName(evaluatorName);
}

export function isImproved(diff: number, direction: Direction): boolean {
  if (direction === 'neutral') return false;
  return direction === 'maximize' ? diff > 0 : diff < 0;
}

const MAX_BETA_ITERATIONS = 100;
const BETA_EPSILON = 3e-7;
const BETA_TINY = 1e-30;

function buildPairKey(score: EvaluationScoreDocument): string {
  return [
    score.example.dataset.id,
    score.example.id,
    score.evaluator.name,
    score.task.repetition_index,
  ].join('\0');
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Pair target scores against baseline scores by dataset, example, evaluator,
 * and repetition index.
 */
export function pairScores(
  targetScores: EvaluationScoreDocument[],
  baselineScores: EvaluationScoreDocument[]
): {
  pairs: PairedScore[];
  skippedMissingPairs: number;
  skippedNullScores: number;
} {
  const baselineByKey = new Map<string, EvaluationScoreDocument>();
  let skippedNullScores = 0;

  for (const score of baselineScores) {
    if (!isFiniteNumber(score.evaluator.score)) {
      skippedNullScores += 1;
      continue;
    }
    baselineByKey.set(buildPairKey(score), score);
  }

  const pairs: PairedScore[] = [];
  let skippedMissingPairs = 0;

  for (const targetScore of targetScores) {
    const key = buildPairKey(targetScore);

    if (!isFiniteNumber(targetScore.evaluator.score)) {
      skippedNullScores += 1;
      baselineByKey.delete(key);
      continue;
    }

    const baselineMatch = baselineByKey.get(key);
    if (!baselineMatch) {
      skippedMissingPairs += 1;
      continue;
    }

    baselineByKey.delete(key);

    const direction = resolveDirection(
      targetScore.evaluator.direction,
      baselineMatch.evaluator.direction,
      targetScore.evaluator.name
    );

    pairs.push({
      datasetId: targetScore.example.dataset.id,
      datasetName: targetScore.example.dataset.name,
      evaluatorName: targetScore.evaluator.name,
      scoreTarget: targetScore.evaluator.score!,
      scoreBaseline: baselineMatch.evaluator.score!,
      direction,
    });
  }

  skippedMissingPairs += baselineByKey.size;

  return {
    pairs,
    skippedMissingPairs,
    skippedNullScores,
  };
}

/**
 * Convert a t-statistic into a two-tailed p-value using the Student's t-distribution.
 */
function tStatisticToPValue(tStatistic: number, degreesOfFreedom: number): number {
  if (!Number.isFinite(tStatistic) || degreesOfFreedom <= 0) {
    return 1;
  }

  const t = Math.abs(tStatistic);
  const x = degreesOfFreedom / (degreesOfFreedom + t * t);
  return clampProbability(incompleteBeta(x, degreesOfFreedom / 2, 0.5));
}

/**
 * Compute paired t-test results grouped by dataset and evaluator.
 * Accepts either raw score documents (which are paired internally)
 * or pre-computed pairs to avoid duplicate pairing work.
 */
export function computePairedTTestResults(pairs: PairedScore[]): PairedTTestResult[];
export function computePairedTTestResults(
  targetScores: EvaluationScoreDocument[],
  baselineScores: EvaluationScoreDocument[]
): PairedTTestResult[];
export function computePairedTTestResults(
  targetScoresOrPairs: EvaluationScoreDocument[] | PairedScore[],
  baselineScores?: EvaluationScoreDocument[]
): PairedTTestResult[] {
  const pairs: PairedScore[] =
    baselineScores !== undefined
      ? pairScores(targetScoresOrPairs as EvaluationScoreDocument[], baselineScores).pairs
      : (targetScoresOrPairs as PairedScore[]);

  const groups = new Map<string, PairedScore[]>();
  for (const pair of pairs) {
    const key = `${pair.datasetId}|${pair.evaluatorName}`;
    const group = groups.get(key);
    if (group) {
      group.push(pair);
    } else {
      groups.set(key, [pair]);
    }
  }

  const results: PairedTTestResult[] = [];
  for (const group of groups.values()) {
    const groupTargetScores = group.map((pair) => pair.scoreTarget);
    const groupBaselineScores = group.map((pair) => pair.scoreBaseline);
    const differences = groupTargetScores.map((score, index) => score - groupBaselineScores[index]);

    let pValue: number | null = null;
    if (differences.length >= 2) {
      const tStatistic = tTest(differences, 0);
      pValue = tStatisticToPValue(tStatistic, differences.length - 1);
    }

    const direction =
      group.find((pair) => pair.direction !== undefined)?.direction ??
      resolveDirection(undefined, undefined, group[0].evaluatorName);

    results.push({
      datasetId: group[0].datasetId,
      datasetName: group[0].datasetName,
      evaluatorName: group[0].evaluatorName,
      sampleSize: group.length,
      meanTarget: mean(groupTargetScores),
      meanBaseline: mean(groupBaselineScores),
      pValue,
      direction,
    });
  }

  return results;
}

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

/**
 * Regularized incomplete beta function.
 * Numerical Recipes in C, 2nd Edition, Chapter 6.4.
 */
function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) {
    return 0;
  }

  if (x >= 1) {
    return 1;
  }

  const logBeta = gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log(1 - x);
  const bt = Math.exp(logBeta);

  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(a, b, x)) / a;
  }

  return 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b;
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;

  if (Math.abs(d) < BETA_TINY) {
    d = BETA_TINY;
  }
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAX_BETA_ITERATIONS; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < BETA_TINY) {
      d = BETA_TINY;
    }
    c = 1 + aa / c;
    if (Math.abs(c) < BETA_TINY) {
      c = BETA_TINY;
    }
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < BETA_TINY) {
      d = BETA_TINY;
    }
    c = 1 + aa / c;
    if (Math.abs(c) < BETA_TINY) {
      c = BETA_TINY;
    }
    d = 1 / d;
    const delta = d * c;
    h *= delta;

    if (Math.abs(delta - 1) < BETA_EPSILON) {
      break;
    }
  }

  return h;
}
