/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { gammaln, mean, tTest } from 'simple-statistics';
import type { EvaluationScoreDocument } from './score_repository';

export interface PairedTTestResult {
  datasetId: string;
  datasetName: string;
  evaluatorName: string;
  sampleSize: number;
  meanA: number;
  meanB: number;
  pValue: number | null;
}

interface PairedScore {
  datasetId: string;
  datasetName: string;
  evaluatorName: string;
  scoreA: number;
  scoreB: number;
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
  ].join('|');
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Pair scores by dataset, example, evaluator, and repetition index.
 */
export function pairScores(
  scoresA: EvaluationScoreDocument[],
  scoresB: EvaluationScoreDocument[]
): {
  pairs: PairedScore[];
  skippedMissingPairs: number;
  skippedNullScores: number;
} {
  const referenceMap = new Map<string, EvaluationScoreDocument>();
  let skippedNullScores = 0;

  for (const score of scoresB) {
    if (!isFiniteNumber(score.evaluator.score)) {
      skippedNullScores += 1;
      continue;
    }
    referenceMap.set(buildPairKey(score), score);
  }

  const pairs: PairedScore[] = [];
  let skippedMissingPairs = 0;

  for (const scoreA of scoresA) {
    if (!isFiniteNumber(scoreA.evaluator.score)) {
      skippedNullScores += 1;
      continue;
    }

    const match = referenceMap.get(buildPairKey(scoreA));
    if (!match) {
      skippedMissingPairs += 1;
      continue;
    }

    if (!isFiniteNumber(match.evaluator.score)) {
      skippedNullScores += 1;
      continue;
    }

    pairs.push({
      datasetId: scoreA.example.dataset.id,
      datasetName: scoreA.example.dataset.name,
      evaluatorName: scoreA.evaluator.name,
      scoreA: scoreA.evaluator.score,
      scoreB: match.evaluator.score,
    });
  }

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
 */
export function computePairedTTestResults(
  scoresA: EvaluationScoreDocument[],
  scoresB: EvaluationScoreDocument[]
): PairedTTestResult[] {
  const { pairs } = pairScores(scoresA, scoresB);

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
    const scoresAArr = group.map((pair) => pair.scoreA);
    const scoresBArr = group.map((pair) => pair.scoreB);
    const differences = scoresAArr.map((score, index) => score - scoresBArr[index]);

    let pValue: number | null = null;
    if (differences.length >= 2) {
      const tStatistic = tTest(differences, 0);
      pValue = tStatisticToPValue(tStatistic, differences.length - 1);
    }

    results.push({
      datasetId: group[0].datasetId,
      datasetName: group[0].datasetName,
      evaluatorName: group[0].evaluatorName,
      sampleSize: group.length,
      meanA: mean(scoresAArr),
      meanB: mean(scoresBArr),
      pValue,
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
