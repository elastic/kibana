/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AggregationsSumAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { GapFillStatus } from '../../../../common';
export interface GapDurationSums {
  totalUnfilledDurationMs: number;
  totalInProgressDurationMs: number;
  totalFilledDurationMs: number;
  totalDurationMs: number;
}

/**
 * Extracts and normalizes gap duration sums from an aggregation bucket
 */
export function extractGapDurationSums(bucket: GapDurationBucket): GapDurationSums {
  return {
    totalUnfilledDurationMs: Math.max(0, bucket.totalUnfilledDurationMs?.value ?? 0),
    totalInProgressDurationMs: Math.max(0, bucket.totalInProgressDurationMs?.value ?? 0),
    totalFilledDurationMs: Math.max(0, bucket.totalFilledDurationMs?.value ?? 0),
    totalDurationMs: Math.max(0, bucket.totalDurationMs?.value ?? 0),
  };
}

/**
 * Calculates aggregated gap fill status based on duration sums
 * Precedence: unfilled > in_progress > filled
 */
export function calculateHighestPriorityGapFillStatus(sums: GapDurationSums): GapFillStatus | null {
  const { totalInProgressDurationMs, totalUnfilledDurationMs, totalFilledDurationMs } = sums;
  if (totalUnfilledDurationMs > 0) return 'unfilled';
  if (totalInProgressDurationMs > 0) return 'in_progress';
  if (totalFilledDurationMs > 0) return 'filled';
  return null;
}

/**
 * Common aggregation fields for gap duration tracking
 */
export const RULE_GAP_AGGREGATIONS = {
  totalUnfilledDurationMs: {
    sum: { field: 'kibana.alert.rule.gap.unfilled_duration_ms' },
  },
  totalInProgressDurationMs: {
    sum: { field: 'kibana.alert.rule.gap.in_progress_duration_ms' },
  },
  totalFilledDurationMs: {
    sum: { field: 'kibana.alert.rule.gap.filled_duration_ms' },
  },
  totalDurationMs: {
    sum: { field: 'kibana.alert.rule.gap.total_gap_duration_ms' },
  },
} as const;

export type GapDurationBucket = { key: string } & Partial<
  Record<keyof typeof RULE_GAP_AGGREGATIONS, AggregationsSumAggregate>
>;

/**
 * Checks if the gap fill status of the bucket matches the given gap fill statuses
 */
export const hasMatchedGapFillStatus = (
  bucket: GapDurationBucket,
  gapFillStatuses: GapFillStatus[]
): boolean => {
  const sums = extractGapDurationSums(bucket);
  const gapFillStatus = calculateHighestPriorityGapFillStatus(sums);

  return Boolean(gapFillStatus && gapFillStatuses.includes(gapFillStatus));
};
