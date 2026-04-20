/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AggregationsSumAggregate } from '@elastic/elasticsearch/lib/api/types';
import type { GapFillStatus } from '../../../../common';

export interface SchedulerContext {
  enabled: boolean;
  numRetries: number;
}

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
 * Precedence: error > unfilled > in_progress > filled
 *
 * @param hasExhaustedRetryGaps - true when at least one gap for this rule is
 *   both unfilled AND has exhausted all auto-fill retry attempts. This is
 *   determined by a filtered ES aggregation built at query time.
 */
export function calculateHighestPriorityGapFillStatus(
  sums: GapDurationSums,
  hasExhaustedRetryGaps: boolean = false
): GapFillStatus | null {
  const { totalInProgressDurationMs, totalUnfilledDurationMs, totalFilledDurationMs } = sums;

  if (hasExhaustedRetryGaps) {
    return 'error';
  }

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
 * Builds a dynamic sub-aggregation that counts gaps which are both unfilled
 * AND have exhausted all auto-fill retry attempts. Only added when scheduler
 * context is available.
 */
export function buildExhaustedRetryGapsAgg(schedulerContext: SchedulerContext) {
  return {
    exhaustedRetryGaps: {
      filter: {
        bool: {
          must: [
            { range: { 'kibana.alert.rule.gap.unfilled_duration_ms': { gt: 0 } } },
            {
              range: {
                'kibana.alert.rule.gap.failed_auto_fill_attempts': {
                  gte: schedulerContext.numRetries,
                },
              },
            },
          ],
        },
      },
      aggs: {
        totalUnfilledDurationMs: {
          sum: { field: 'kibana.alert.rule.gap.unfilled_duration_ms' },
        },
      },
    },
  };
}

export interface ExhaustedRetryGapsInfo {
  hasExhaustedRetryGaps: boolean;
  exhaustedRetryUnfilledDurationMs: number;
}

/**
 * Extracts exhausted retry gaps info from a rule bucket:
 * whether any such gaps exist and their total unfilled duration.
 */
export function getExhaustedRetryGapsInfo(bucket: Record<string, unknown>): ExhaustedRetryGapsInfo {
  const exhaustedRetryGaps = bucket.exhaustedRetryGaps as
    | { doc_count?: number; totalUnfilledDurationMs?: { value?: number } }
    | undefined;
  const docCount = exhaustedRetryGaps?.doc_count ?? 0;
  return {
    hasExhaustedRetryGaps: docCount > 0,
    exhaustedRetryUnfilledDurationMs: exhaustedRetryGaps?.totalUnfilledDurationMs?.value ?? 0,
  };
}

/**
 * Checks if the gap fill status of the bucket matches the given gap fill statuses
 */
export const hasMatchedGapFillStatus = (
  bucket: GapDurationBucket,
  gapFillStatuses: GapFillStatus[],
  exhaustedRetryGaps: boolean = false
): boolean => {
  const sums = extractGapDurationSums(bucket);
  const gapFillStatus = calculateHighestPriorityGapFillStatus(sums, exhaustedRetryGaps);

  return Boolean(gapFillStatus && gapFillStatuses.includes(gapFillStatus));
};
