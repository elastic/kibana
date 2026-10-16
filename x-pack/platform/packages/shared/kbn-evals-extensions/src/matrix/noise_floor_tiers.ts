/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRng, quantile } from './model_comparison';

/** One row as the tie analysis sees it: its ranking score and per-column scores. */
export interface TieCandidate {
  modelId: string;
  modelLabel: string;
  /** Ranking score on the published scale; undefined rows are never tiered. */
  rankValue: number | undefined;
  /** Base column id -> score on the published scale, for scored columns only. */
  columnValues: ReadonlyMap<string, number>;
}

export interface NoiseFloorSettings {
  /** Smallest ranking gap, on the published scale, that may split a tier. */
  floor: number;
  seed: number;
  resamples: number;
  borderlineEpsilon: number;
  minSharedColumns: number;
}

export type TieBoundaryReason =
  | 'separated'
  | 'too-few-shared-columns'
  | 'within-noise-floor'
  | 'ci-includes-zero';

/** The comparison between one row and the row ranked directly below it. */
export interface TieBoundary {
  upperModelId: string;
  lowerModelId: string;
  /** Ranking-score difference, upper minus lower. */
  gap: number;
  sharedColumns: number;
  /** 95% paired-bootstrap interval of the weighted mean difference over shared columns. */
  ciLow?: number;
  ciHigh?: number;
  /** True when this boundary starts a new tier. */
  separated: boolean;
  /** An interval edge within `borderlineEpsilon` of 0: another seed could flip it. */
  borderline: boolean;
  reason: TieBoundaryReason;
}

export interface NoiseFloorTiering {
  /** 1-based tier per candidate, aligned with the input order; undefined when unranked. */
  tiers: Array<number | undefined>;
  boundaries: TieBoundary[];
}

/**
 * Stable per-pair seed offset. Keyed on model ids rather than row position so
 * adding a model to the board does not reshuffle every other pair's resample.
 */
const pairSeed = (seed: number, upper: string, lower: string): number => {
  const key = `${upper}\u0000${lower}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % 2147483647;
  }
  return seed + hash;
};

const weightedMean = (values: readonly number[], weights: readonly number[]): number => {
  let sum = 0;
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] * weights[i];
    total += weights[i];
  }
  return total === 0 ? 0 : sum / total;
};

/**
 * Paired bootstrap of the weighted mean difference between two rows.
 *
 * Pairs on column id: only columns BOTH rows scored contribute, and each
 * resample draws the same columns for both. Pairing by position after dropping
 * missing columns would compare different prompts and overstate separability.
 */
const pairedInterval = (
  upper: TieCandidate,
  lower: TieCandidate,
  weights: ReadonlyMap<string, number>,
  settings: NoiseFloorSettings
): { shared: number; low?: number; high?: number } => {
  const diffs: number[] = [];
  const columnWeights: number[] = [];
  for (const [columnId, weight] of weights) {
    const a = upper.columnValues.get(columnId);
    const b = lower.columnValues.get(columnId);
    if (a === undefined || b === undefined || weight <= 0) {
      continue;
    }
    diffs.push(a - b);
    columnWeights.push(weight);
  }

  if (diffs.length < settings.minSharedColumns) {
    return { shared: diffs.length };
  }

  const rng = createRng(pairSeed(settings.seed, upper.modelId, lower.modelId));
  const means: number[] = [];
  const pickedDiffs = new Array<number>(diffs.length);
  const pickedWeights = new Array<number>(diffs.length);
  for (let r = 0; r < settings.resamples; r++) {
    for (let j = 0; j < diffs.length; j++) {
      const pick = Math.floor(rng() * diffs.length);
      pickedDiffs[j] = diffs[pick];
      pickedWeights[j] = columnWeights[pick];
    }
    means.push(weightedMean(pickedDiffs, pickedWeights));
  }
  means.sort((x, y) => x - y);
  return { shared: diffs.length, low: quantile(means, 0.025), high: quantile(means, 0.975) };
};

/**
 * Groups rows already sorted by rank value (descending) into tiers.
 *
 * Only adjacent rows are compared, and a boundary needs both statistical
 * separation (interval clear of 0) and a gap of at least the noise floor:
 * separation alone splits near-zero-variance rows on a 0.01 gap no reader
 * should act on, and the floor alone ignores how much each row's mean depends
 * on which prompts were sampled.
 */
export const assignNoiseFloorTiers = (
  candidates: readonly TieCandidate[],
  weights: ReadonlyMap<string, number>,
  settings: NoiseFloorSettings
): NoiseFloorTiering => {
  const tiers: Array<number | undefined> = candidates.map(() => undefined);
  const boundaries: TieBoundary[] = [];

  let tier = 0;
  let previous: number | undefined;
  candidates.forEach((candidate, index) => {
    if (candidate.rankValue === undefined) {
      return;
    }
    if (previous === undefined) {
      tier = 1;
    } else {
      const upper = candidates[previous];
      const gap = (upper.rankValue ?? 0) - candidate.rankValue;
      const { shared, low, high } = pairedInterval(upper, candidate, weights, settings);
      const hasInterval = low !== undefined && high !== undefined;
      const reason: TieBoundaryReason = !hasInterval
        ? 'too-few-shared-columns'
        : gap < settings.floor
        ? 'within-noise-floor'
        : low <= 0
        ? 'ci-includes-zero'
        : 'separated';
      const borderline =
        hasInterval &&
        (Math.abs(low) <= settings.borderlineEpsilon ||
          Math.abs(high) <= settings.borderlineEpsilon);
      const separated = reason === 'separated';
      boundaries.push({
        upperModelId: upper.modelId,
        lowerModelId: candidate.modelId,
        gap,
        sharedColumns: shared,
        ...(hasInterval ? { ciLow: low, ciHigh: high } : {}),
        separated,
        borderline,
        reason,
      });
      if (separated) {
        tier += 1;
      }
    }
    tiers[index] = tier;
    previous = index;
  });

  return { tiers, boundaries };
};
