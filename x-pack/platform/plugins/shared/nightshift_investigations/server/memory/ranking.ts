/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Deductive-parity decay, counter updates, Thompson / greedy ranking, and Beta
 * confidence. Pure functions: injectable `now` (epoch seconds) and Beta sampler.
 * Do not persist read-decay; only `applyUpdate` advances `lastTime`.
 *
 * Source formulas: Deductive `real_time_counters.py`, `bandit.py`, `confidence.py`.
 */

export const HALF_LIFE_SEC = 7 * 24 * 3600;
export const DECAY_LAMBDA = Math.log(2) / HALF_LIFE_SEC;
export const RANKING_EPS = 1e-9;

/** Deductive GlobalEmpiricalPrior cold start: mean=0.5 → Beta(1,1). */
export const COLD_START_PRIOR = { alpha0: 1, beta0: 1 } as const;

export interface BetaPrior {
  alpha0: number;
  beta0: number;
}

/** Epoch seconds, matching Deductive Redis field `t`. */
export interface CounterState {
  impressions: number;
  conversions: number;
  lastTime: number;
}

export interface CounterUpdate {
  id: string;
  addImp: number;
  addConv: number;
}

export interface RankedArm {
  id: string;
  impressions: number;
  conversions: number;
}

export type SampleBeta = (alpha: number, beta: number) => number;

export type RankMode = 'search' | 'browse';
export type BrowseRanker = 'thompson' | 'greedy';

export const decayValue = (old: number, t0: number, now: number): number => {
  const deltaSec = Math.max(0, now - t0);
  return old * Math.exp(-DECAY_LAMBDA * deltaSec);
};

/**
 * Read-time decay. Does not change `lastTime` — callers must not persist this
 * as a write.
 */
export const decayCounters = (state: CounterState, now: number): CounterState => ({
  impressions: decayValue(state.impressions, state.lastTime, now),
  conversions: decayValue(state.conversions, state.lastTime, now),
  lastTime: state.lastTime,
});

export const conversionRate = (impressions: number, conversions: number): number =>
  impressions > 0 ? conversions / impressions : 0;

export const applyUpdate = (
  state: CounterState,
  now: number,
  addImp: number,
  addConv: number
): CounterState => {
  const decayed = decayCounters(state, now);
  return {
    impressions: decayed.impressions + addImp,
    conversions: decayed.conversions + addConv,
    lastTime: now,
  };
};

const emptyCounter = (now: number): CounterState => ({
  impressions: 0,
  conversions: 0,
  lastTime: now,
});

/**
 * Apply a batch with a single `now`. Duplicate ids have deltas summed first.
 * Missing ids start at (0, 0) with `lastTime = now` (no decay), matching Redis
 * hashes that do not exist yet.
 */
export const applyUpdates = (
  current: Readonly<Record<string, CounterState>>,
  updates: readonly CounterUpdate[],
  now: number
): Record<string, CounterState> => {
  const merged = new Map<string, { addImp: number; addConv: number }>();
  const sorted = [...updates].sort((left, right) => left.id.localeCompare(right.id));
  for (const update of sorted) {
    const prev = merged.get(update.id) ?? { addImp: 0, addConv: 0 };
    merged.set(update.id, {
      addImp: prev.addImp + update.addImp,
      addConv: prev.addConv + update.addConv,
    });
  }

  const next: Record<string, CounterState> = { ...current };
  for (const [id, delta] of merged) {
    const existing = current[id] ?? emptyCounter(now);
    next[id] = applyUpdate(existing, now, delta.addImp, delta.addConv);
  }
  return next;
};

/**
 * Map critique labels onto counter deltas. Harmful ids are archived and
 * dropped from the impression set before any increment. Every remaining
 * impression gets +1 imp; useful also gets +1 conv. Useful ids that were
 * never shown are ignored.
 */
export const toCounterUpdates = ({
  impressionIds,
  usefulIds,
  harmfulIds,
}: {
  impressionIds: readonly string[];
  usefulIds: readonly string[];
  harmfulIds: readonly string[];
}): { archiveIds: string[]; updates: CounterUpdate[] } => {
  const harmful = new Set(harmfulIds);
  const useful = new Set(usefulIds);
  const archiveIds = [...harmful].sort((left, right) => left.localeCompare(right));
  const remaining = [...new Set(impressionIds)]
    .filter((id) => !harmful.has(id))
    .sort((left, right) => left.localeCompare(right));

  return {
    archiveIds,
    updates: remaining.map((id) => ({
      id,
      addImp: 1,
      addConv: useful.has(id) ? 1 : 0,
    })),
  };
};

const resolvePrior = (prior?: BetaPrior): BetaPrior => prior ?? COLD_START_PRIOR;

export const greedyScore = (
  impressions: number,
  conversions: number,
  prior: BetaPrior = COLD_START_PRIOR
): number =>
  (prior.alpha0 + conversions) / Math.max(prior.alpha0 + prior.beta0 + impressions, RANKING_EPS);

export const posteriorShape = (
  impressions: number,
  conversions: number,
  prior: BetaPrior = COLD_START_PRIOR
): { alpha: number; beta: number } => ({
  alpha: Math.max(prior.alpha0 + conversions, RANKING_EPS),
  beta: Math.max(prior.beta0 + impressions - conversions, RANKING_EPS),
});

export const greedyRank = (arms: readonly RankedArm[], prior?: BetaPrior): string[] => {
  const resolved = resolvePrior(prior);
  const scored = arms.map((arm) => ({
    id: arm.id,
    score: greedyScore(arm.impressions, arm.conversions, resolved),
  }));
  scored.sort((left, right) => right.score - left.score);
  return scored.map((row) => row.id);
};

const defaultSampleBeta: SampleBeta = (alpha, beta) => betaQuantile(Math.random(), alpha, beta);

export const thompsonRank = (
  arms: readonly RankedArm[],
  options?: {
    prior?: BetaPrior;
    sampleBeta?: SampleBeta;
  }
): string[] => {
  const prior = resolvePrior(options?.prior);
  const sampleBeta = options?.sampleBeta ?? defaultSampleBeta;
  const scored = arms.map((arm) => {
    const shape = posteriorShape(arm.impressions, arm.conversions, prior);
    return { id: arm.id, score: sampleBeta(shape.alpha, shape.beta) };
  });
  scored.sort((left, right) => right.score - left.score);
  return scored.map((row) => row.id);
};

const toArm = (
  id: string,
  states: Readonly<Record<string, Pick<RankedArm, 'impressions' | 'conversions'>>>
): RankedArm => {
  const state = states[id];
  return {
    id,
    impressions: state?.impressions ?? 0,
    conversions: state?.conversions ?? 0,
  };
};

/**
 * Search keeps caller order (semantic / BM25). Browse reorders with Thompson
 * or greedy. The search path must not invoke the sampler.
 */
export const rankForMode = ({
  mode,
  ids,
  states,
  browseRanker = 'thompson',
  sampleBeta,
  prior,
}: {
  mode: RankMode;
  ids: readonly string[];
  states: Readonly<Record<string, Pick<RankedArm, 'impressions' | 'conversions'>>>;
  browseRanker?: BrowseRanker;
  sampleBeta?: SampleBeta;
  prior?: BetaPrior;
}): string[] => {
  if (mode === 'search') {
    return [...ids];
  }
  const arms = ids.map((id) => toArm(id, states));
  if (browseRanker === 'greedy') {
    return greedyRank(arms, prior);
  }
  return thompsonRank(arms, { prior, sampleBeta });
};

export const calculateConfidence = (
  impressions: number,
  conversions: number,
  prior: BetaPrior = COLD_START_PRIOR
): number => {
  if (impressions <= 0) {
    return 0;
  }
  const { alpha, beta } = posteriorShape(impressions, conversions, prior);
  const width = betaQuantile(0.975, alpha, beta) - betaQuantile(0.025, alpha, beta);
  return Math.max(0, 1 - width);
};

export const displayTelemetry = (
  state: CounterState,
  now: number,
  prior: BetaPrior = COLD_START_PRIOR
): {
  impressions: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  lastTime: number;
} => {
  const decayed = decayCounters(state, now);
  return {
    impressions: decayed.impressions,
    conversions: decayed.conversions,
    conversionRate: conversionRate(decayed.impressions, decayed.conversions),
    confidence: calculateConfidence(decayed.impressions, decayed.conversions, prior),
    lastTime: state.lastTime,
  };
};

// --- Beta quantile (regularized incomplete beta + bisection) -----------------
// Incomplete beta: Numerical Recipes in C, 2nd ed., §6.4. Inverse is a
// bisection of that CDF so confidence goldens can be pinned to SciPy's
// `beta.ppf` without a runtime dependency.

const GAMMALN_P = [
  0.99999999999980993, 676.5203681213779, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

const gammaln = (z: number): number => {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - gammaln(1 - z);
  }
  const shifted = z - 1;
  let x = GAMMALN_P[0];
  for (let i = 1; i < GAMMALN_P.length; i++) {
    x += GAMMALN_P[i] / (shifted + i);
  }
  const t = shifted + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(x);
};

const BETA_TINY = 1e-30;
const BETA_EPSILON = 3e-7;
const MAX_BETA_ITERATIONS = 100;

const betaContinuedFraction = (a: number, b: number, x: number): number => {
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

  for (let m = 1; m <= MAX_BETA_ITERATIONS; m++) {
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
};

const regularizedIncompleteBeta = (x: number, a: number, b: number): number => {
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
};

const QUANTILE_ITERATIONS = 64;

export const betaQuantile = (p: number, alpha: number, beta: number): number => {
  if (p <= 0) {
    return 0;
  }
  if (p >= 1) {
    return 1;
  }
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < QUANTILE_ITERATIONS; i++) {
    const mid = 0.5 * (lo + hi);
    if (regularizedIncompleteBeta(mid, alpha, beta) < p) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return 0.5 * (lo + hi);
};
