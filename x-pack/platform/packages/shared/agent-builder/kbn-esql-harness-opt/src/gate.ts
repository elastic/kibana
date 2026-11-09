/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExampleRun, RunSummary } from './runner';
import { createRandom } from './corpora/random';

export interface GateResult {
  accepted: boolean;
  meanDelta: number;
  ciLow: number;
  ciHigh: number;
  improvements: string[];
  regressions: string[];
  costRatio: number;
  reasons: string[];
}

const meanBySeed = (runs: ExampleRun[]): Map<string, number> => {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const run of runs) {
    const current = totals.get(run.seedId) ?? { sum: 0, count: 0 };
    totals.set(run.seedId, { sum: current.sum + run.score.reward, count: current.count + 1 });
  }
  return new Map(
    [...totals].map(([seedId, { sum, count }]) => [seedId, count === 0 ? 0 : sum / count])
  );
};

const totalTokens = (summary: RunSummary): number =>
  summary.totalInputTokens + summary.totalOutputTokens;

/**
 * Paired accept test, clustered by seed.
 *
 * Resampling is over *seeds*, not rows: rollouts and (later) permutations of the same seed are
 * not independent observations, and treating them as such is exactly the winner's curse the
 * harness-optimization literature measures at 13–20 points of inflated held-out accuracy.
 */
export const gateCandidate = ({
  incumbent,
  candidate,
  maxRegressions = 2,
  maxCostRatio = 1.1,
  iterations = 10_000,
  regressionEpsilon = 0.05,
}: {
  incumbent: RunSummary;
  candidate: RunSummary;
  maxRegressions?: number;
  maxCostRatio?: number;
  iterations?: number;
  regressionEpsilon?: number;
}): GateResult => {
  const incumbentBySeed = meanBySeed(incumbent.runs);
  const candidateBySeed = meanBySeed(candidate.runs);
  const seeds = [...incumbentBySeed.keys()].filter((seedId) => candidateBySeed.has(seedId));

  const deltas = seeds.map(
    (seedId) => (candidateBySeed.get(seedId) ?? 0) - (incumbentBySeed.get(seedId) ?? 0)
  );
  const meanDelta = deltas.reduce((total, delta) => total + delta, 0) / (deltas.length || 1);

  const random = createRandom(`gate:${incumbent.configHash}:${candidate.configHash}`);
  const bootstrapMeans: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration++) {
    let sum = 0;
    for (let i = 0; i < deltas.length; i++) {
      sum += deltas[random.int(deltas.length)];
    }
    bootstrapMeans.push(sum / (deltas.length || 1));
  }
  bootstrapMeans.sort((a, b) => a - b);
  const ciLow = bootstrapMeans[Math.floor(0.025 * bootstrapMeans.length)] ?? 0;
  const ciHigh = bootstrapMeans[Math.floor(0.975 * bootstrapMeans.length)] ?? 0;

  const improvements = seeds.filter(
    (seedId) =>
      (candidateBySeed.get(seedId) ?? 0) - (incumbentBySeed.get(seedId) ?? 0) > regressionEpsilon
  );
  const regressions = seeds.filter(
    (seedId) =>
      (incumbentBySeed.get(seedId) ?? 0) - (candidateBySeed.get(seedId) ?? 0) > regressionEpsilon
  );

  const incumbentCost = totalTokens(incumbent) || 1;
  const costRatio = totalTokens(candidate) / incumbentCost;

  const reasons: string[] = [];
  if (ciLow <= 0) {
    reasons.push(`paired bootstrap CI includes 0 (${ciLow.toFixed(3)}, ${ciHigh.toFixed(3)})`);
  }
  if (regressions.length > maxRegressions) {
    reasons.push(`${regressions.length} regressed seeds (max ${maxRegressions})`);
  }
  if (costRatio > maxCostRatio) {
    reasons.push(`cost ratio ${costRatio.toFixed(2)}× (max ${maxCostRatio}×)`);
  }

  return {
    accepted: reasons.length === 0,
    meanDelta,
    ciLow,
    ciHigh,
    improvements,
    regressions,
    costRatio,
    reasons,
  };
};
