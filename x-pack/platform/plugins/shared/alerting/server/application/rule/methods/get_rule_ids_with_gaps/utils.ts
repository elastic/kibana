/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregatedGapStatus } from '../../../../../common/constants/gap_status';

export interface GapDurationSums {
  sumUnfilledMs: number;
  sumInProgressMs: number;
  sumFilledMs: number;
  sumTotalMs?: number;
}

export interface GapDurationBucket {
  sum_unfilled_ms?: { value: number | null };
  sum_in_progress_ms?: { value: number | null };
  sum_filled_ms?: { value: number | null };
  sum_total_ms?: { value: number | null };
}

/**
 * Extracts and normalizes gap duration sums from an aggregation bucket
 */
export function extractGapDurationSums(bucket: GapDurationBucket): GapDurationSums {
  return {
    sumUnfilledMs: Math.max(0, bucket.sum_unfilled_ms?.value ?? 0),
    sumInProgressMs: Math.max(0, bucket.sum_in_progress_ms?.value ?? 0),
    sumFilledMs: Math.max(0, bucket.sum_filled_ms?.value ?? 0),
    sumTotalMs: bucket.sum_total_ms ? Math.max(0, bucket.sum_total_ms.value ?? 0) : undefined,
  };
}

/**
 * Calculates aggregated gap status based on duration sums
 * Precedence: unfilled > in_progress > filled
 */
export function calculateAggregatedGapStatus(sums: GapDurationSums): AggregatedGapStatus | null {
  const { sumInProgressMs, sumUnfilledMs, sumFilledMs } = sums;
  if (sumUnfilledMs > 0) return 'unfilled';
  if (sumInProgressMs > 0) return 'in_progress';
  if (sumFilledMs > 0) return 'filled';
  return null;
}

/**
 * Common aggregation fields for gap duration tracking
 */
export const COMMON_GAP_AGGREGATIONS = {
  sum_unfilled_ms: {
    sum: { field: 'kibana.alert.rule.gap.unfilled_duration_ms' },
  },
  sum_in_progress_ms: {
    sum: { field: 'kibana.alert.rule.gap.in_progress_duration_ms' },
  },
  sum_filled_ms: {
    sum: { field: 'kibana.alert.rule.gap.filled_duration_ms' },
  },
  sum_total_ms: {
    sum: { field: 'kibana.alert.rule.gap.total_gap_duration_ms' },
  },
} as const;
