/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Editorial reductions that bring Lens-scale cardinality down to Adaptive UI
// primitive budgets. The compact profile is tuned for small specs and agent
// payloads; the full profile is for preview/sandbox/report views where visual
// fidelity matters more than staying under a strict byte ceiling.

export interface ReductionPolicy {
  /**
   * Maximum number of series (XY) or slices (partition) to retain. The
   * remaining items are rolled into an "Other" bucket when `otherBucket` is
   * true; otherwise they are dropped and a diagnostic is emitted.
   */
  topN?: number;
  /**
   * For partition charts, whether to fold the tail into an "Other" slice. Has
   * no effect when `topN` is unset or when the source already fits.
   */
  otherBucket?: boolean;
  /**
   * Maximum number of buckets along the X axis (XY/timeSeries). When the
   * source has more points, the binder resamples by averaging within
   * `ceil(N/maxBuckets)`-sized windows.
   */
  maxBuckets?: number;
  /**
   * For datatable, maximum number of rows to retain.
   */
  maxRows?: number;
}

export type AdaptivePrimitiveProfile = 'compact' | 'full';

export type ReductionTarget = 'xy' | 'partition' | 'treemap' | 'datatable';

export const DEFAULT_XY_REDUCTIONS: ReductionPolicy = {
  topN: 5,
  maxBuckets: 24,
};

export const DEFAULT_PARTITION_REDUCTIONS: ReductionPolicy = {
  topN: 5,
  otherBucket: true,
};

export const DEFAULT_TREEMAP_REDUCTIONS: ReductionPolicy = {
  topN: 12,
  otherBucket: true,
};

export const DEFAULT_TABLE_REDUCTIONS: ReductionPolicy = {
  maxRows: 15,
};

export const FULL_XY_REDUCTIONS: ReductionPolicy = {
  topN: 12,
  maxBuckets: 96,
};

export const FULL_PARTITION_REDUCTIONS: ReductionPolicy = {
  topN: 24,
  otherBucket: true,
};

export const FULL_TREEMAP_REDUCTIONS: ReductionPolicy = {
  topN: 31,
  otherBucket: true,
};

export const FULL_TABLE_REDUCTIONS: ReductionPolicy = {
  maxRows: 100,
};

const COMPACT_REDUCTIONS_BY_TARGET: Record<ReductionTarget, ReductionPolicy> = {
  xy: DEFAULT_XY_REDUCTIONS,
  partition: DEFAULT_PARTITION_REDUCTIONS,
  treemap: DEFAULT_TREEMAP_REDUCTIONS,
  datatable: DEFAULT_TABLE_REDUCTIONS,
};

const FULL_REDUCTIONS_BY_TARGET: Record<ReductionTarget, ReductionPolicy> = {
  xy: FULL_XY_REDUCTIONS,
  partition: FULL_PARTITION_REDUCTIONS,
  treemap: FULL_TREEMAP_REDUCTIONS,
  datatable: FULL_TABLE_REDUCTIONS,
};

export const reductionsForProfile = (
  target: ReductionTarget,
  profile: AdaptivePrimitiveProfile = 'compact'
): ReductionPolicy => ({
  ...(profile === 'full'
    ? FULL_REDUCTIONS_BY_TARGET[target]
    : COMPACT_REDUCTIONS_BY_TARGET[target]),
});
