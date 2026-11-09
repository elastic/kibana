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
  /** Which acceptance path the candidate took, if any. */
  acceptedVia: 'quality' | 'cost' | null;
  meanDelta: number;
  ciLow: number;
  ciHigh: number;
  /** Δ(USD per solved example), candidate − incumbent. Negative is cheaper. */
  costPerSolvedDelta: number;
  costPerSolvedCiLow: number;
  costPerSolvedCiHigh: number;
  incumbentCostPerSolved: number;
  candidateCostPerSolved: number;
  improvements: string[];
  regressions: string[];
  costRatio: number;
  reasons: string[];
}

interface SeedAggregate {
  reward: number;
  cost: number;
}

const aggregateBySeed = (runs: ExampleRun[]): Map<string, SeedAggregate> => {
  const totals = new Map<string, { reward: number; cost: number; count: number }>();
  for (const run of runs) {
    const current = totals.get(run.seedId) ?? { reward: 0, cost: 0, count: 0 };
    totals.set(run.seedId, {
      reward: current.reward + run.score.reward,
      cost: current.cost + (run.costUsd ?? 0),
      count: current.count + 1,
    });
  }
  return new Map(
    [...totals].map(([seedId, { reward, cost, count }]) => [
      seedId,
      { reward: count === 0 ? 0 : reward / count, cost: count === 0 ? 0 : cost / count },
    ])
  );
};

/**
 * USD spent per unit of reward earned, over a set of seeds.
 *
 * Ratio-of-sums rather than mean-of-ratios: a seed the harness never solves would otherwise
 * contribute an infinite per-seed ratio and dominate the statistic.
 */
const costPerSolved = (seeds: string[], aggregates: Map<string, SeedAggregate>): number => {
  let cost = 0;
  let reward = 0;
  for (const seedId of seeds) {
    const aggregate = aggregates.get(seedId);
    if (!aggregate) continue;
    cost += aggregate.cost;
    reward += aggregate.reward;
  }
  return reward === 0 ? Number.POSITIVE_INFINITY : cost / reward;
};

const percentile = (sorted: number[], fraction: number): number =>
  sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))] ?? 0;

/**
 * Paired accept test, clustered by seed, with two acceptance paths.
 *
 * Resampling is over *seeds*, not rows: rollouts and (later) permutations of the same seed are
 * not independent observations, and treating them as such is the winner's curse the
 * harness-optimization literature measures at 13–20 points of inflated held-out accuracy.
 *
 * The two paths mirror the experiment's success criteria, and keep quality and cost jointly
 * optimized without inventing a weight between them:
 *
 * - **quality**: reward is significantly up, cost no more than `maxCostRatio`;
 * - **cost**: reward is non-inferior (its CI's lower bound stays above `−nonInferiorityMargin`)
 *   and tokens per solved example are significantly down.
 *
 * Either way regressions are capped, so a candidate cannot trade solved examples for averages.
 */
export const gateCandidate = ({
  incumbent,
  candidate,
  maxRegressionShare = 0.05,
  maxCostRatio = 1.1,
  iterations = 10_000,
  regressionEpsilon = 0.05,
  nonInferiorityMargin = 0.02,
}: {
  incumbent: RunSummary;
  candidate: RunSummary;
  /** Regressed seeds tolerated, as a share of the split (floor of 2). */
  maxRegressionShare?: number;
  maxCostRatio?: number;
  iterations?: number;
  regressionEpsilon?: number;
  nonInferiorityMargin?: number;
}): GateResult => {
  const incumbentBySeed = aggregateBySeed(incumbent.runs);
  const candidateBySeed = aggregateBySeed(candidate.runs);
  const seeds = [...incumbentBySeed.keys()].filter((seedId) => candidateBySeed.has(seedId));

  const rewardDelta = (seedId: string): number =>
    (candidateBySeed.get(seedId)?.reward ?? 0) - (incumbentBySeed.get(seedId)?.reward ?? 0);

  const deltas = seeds.map(rewardDelta);
  const meanDelta = deltas.reduce((total, delta) => total + delta, 0) / (deltas.length || 1);

  const incumbentCostPerSolved = costPerSolved(seeds, incumbentBySeed);
  const candidateCostPerSolved = costPerSolved(seeds, candidateBySeed);
  const costPerSolvedDelta = candidateCostPerSolved - incumbentCostPerSolved;

  // One resampling pass produces both statistics, so they describe the same bootstrap draws.
  const random = createRandom(`gate:${incumbent.configHash}:${candidate.configHash}`);
  const rewardMeans: number[] = [];
  const costDeltas: number[] = [];
  for (let iteration = 0; iteration < iterations; iteration++) {
    const sample: string[] = [];
    let rewardSum = 0;
    for (let i = 0; i < seeds.length; i++) {
      const seedId = seeds[random.int(seeds.length)];
      sample.push(seedId);
      rewardSum += rewardDelta(seedId);
    }
    rewardMeans.push(rewardSum / (seeds.length || 1));
    costDeltas.push(
      costPerSolved(sample, candidateBySeed) - costPerSolved(sample, incumbentBySeed)
    );
  }
  rewardMeans.sort((a, b) => a - b);
  costDeltas.sort((a, b) => a - b);

  const ciLow = percentile(rewardMeans, 0.025);
  const ciHigh = percentile(rewardMeans, 0.975);
  const costPerSolvedCiLow = percentile(costDeltas, 0.025);
  const costPerSolvedCiHigh = percentile(costDeltas, 0.975);

  const improvements = seeds.filter((seedId) => rewardDelta(seedId) > regressionEpsilon);
  const regressions = seeds.filter((seedId) => rewardDelta(seedId) < -regressionEpsilon);

  const costRatio = candidate.totalCostUsd / (incumbent.totalCostUsd || Number.EPSILON);

  const qualityWin = ciLow > 0 && costRatio <= maxCostRatio;
  const costWin = ciLow > -nonInferiorityMargin && costPerSolvedCiHigh < 0;
  // The cap scales with the split: at 79 seeds and two rollouts, a fixed "at most 2 regressions"
  // is below the noise floor, and it rejected a candidate that improved 13 seeds and lost 4.
  // Improvements must still clearly outnumber regressions, which is the property that actually
  // matters — a candidate trading solved examples for an average is what the cap exists to stop.
  const maxRegressions = Math.max(2, Math.ceil(maxRegressionShare * seeds.length));
  const regressionsOk =
    regressions.length <= maxRegressions && improvements.length > regressions.length;

  const reasons: string[] = [];
  if (!regressionsOk) {
    reasons.push(
      `${regressions.length} regressed seeds vs ${improvements.length} improved (cap ${maxRegressions})`
    );
  }
  if (!qualityWin && !costWin) {
    reasons.push(
      `no accept path: reward CI (${ciLow.toFixed(3)}, ${ciHigh.toFixed(3)}) at ${costRatio.toFixed(
        2
      )}× cost; cost/solved CI (${costPerSolvedCiLow.toFixed(0)}, ${costPerSolvedCiHigh.toFixed(
        0
      )}) tokens`
    );
  }

  return {
    accepted: regressionsOk && (qualityWin || costWin),
    acceptedVia: !regressionsOk ? null : qualityWin ? 'quality' : costWin ? 'cost' : null,
    meanDelta,
    ciLow,
    ciHigh,
    costPerSolvedDelta,
    costPerSolvedCiLow,
    costPerSolvedCiHigh,
    incumbentCostPerSolved,
    candidateCostPerSolved,
    improvements,
    regressions,
    costRatio,
    reasons,
  };
};
