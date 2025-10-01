/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClientContext } from '../../../../rules_client';
import { buildBaseGapsFilter, resolveTimeRange } from './gap_intervals';
import type { AggregatedGapStatus } from '../../../../../common/constants';
import { aggregatedGapStatus } from '../../../../../common/constants';
export interface RuleGapStatusSummary {
  ruleId: string;
  status: AggregatedGapStatus;
  counts: { filled: number; partially_filled: number; unfilled: number };
  inProgressDocs: number;
  latestUpdate?: string;
}

export interface GetAggregatedGapStatusByRuleIdsParams {
  ruleIds: string[];
  timeRange?: { from: string; to: string };
}

interface ByRuleBucket {
  key: string; // rule.id
  doc_count: number;
  sum_unfilled_ms: { value: number | null };
  sum_in_progress_ms: { value: number | null };
  sum_filled_ms: { value: number | null };
  sum_total_ms?: { value: number | null };
  latest_update: { value: number | null };
}

export async function getAggregatedGapStatusByRuleIds(
  context: RulesClientContext,
  params: GetAggregatedGapStatusByRuleIdsParams
): Promise<Record<string, RuleGapStatusSummary>> {
  try {
    const { ruleIds } = params;
    if (!ruleIds.length) {
      return {};
    }

    const { from, to } = resolveTimeRange(params.timeRange);
    const filter = `${buildBaseGapsFilter(from, to)} AND kibana.alert.rule.gap.status: *`;

    const eventLogClient = await context.getEventLogClient();

    const aggs = await eventLogClient.aggregateEventsBySavedObjectIds('alert', ruleIds, {
      filter,
      aggs: {
        by_rule: {
          terms: { field: 'rule.id', size: 10000, order: { _key: 'asc' } },
          aggs: {
            // sums-only aggregations
            sum_unfilled_ms: {
              sum: { field: 'kibana.alert.rule.gap.unfilled_duration_ms' },
            },
            sum_in_progress_ms: {
              sum: { field: 'kibana.alert.rule.gap.in_progress_duration_ms' },
            },
            sum_filled_ms: {
              sum: { field: 'kibana.alert.rule.gap.filled_duration_ms' },
            },
            // optional total
            sum_total_ms: {
              sum: { field: 'kibana.alert.rule.gap.total_gap_duration_ms' },
            },
            latest_update: { max: { field: '@timestamp' } },
          },
        },
      },
    });

    const byRule = (aggs.aggregations?.by_rule?.buckets as unknown as ByRuleBucket[]) ?? [];

    const result: Record<string, RuleGapStatusSummary> = {};

    for (const bucket of byRule) {
      const sumUnfilledMs = Math.max(0, bucket.sum_unfilled_ms?.value ?? 0);
      const sumInProgressMs = Math.max(0, bucket.sum_in_progress_ms?.value ?? 0);
      const sumFilledMs = Math.max(0, bucket.sum_filled_ms?.value ?? 0);
      const sumTotalMs = Math.max(0, bucket.sum_total_ms?.value ?? 0);

      // Aggregated status based on sums
      const status =
        sumInProgressMs > 0
          ? aggregatedGapStatus.IN_PROGRESS
          : sumUnfilledMs > 0
          ? aggregatedGapStatus.UNFILLED
          : sumFilledMs > 0
          ? aggregatedGapStatus.FILLED
          : null;

      const latestUpdate = bucket.latest_update?.value
        ? new Date(bucket.latest_update.value).toISOString()
        : undefined;

      // keep legacy fields for backwards compatibility
      const counts = {
        filled: sumFilledMs > 0 ? 1 : 0,
        partially_filled: 0,
        unfilled: sumUnfilledMs > 0 ? 1 : 0,
      };
      const inProgressDocs = sumInProgressMs > 0 ? 1 : 0;

      const extended: RuleGapStatusSummary & {
        sums?: {
          unfilled_ms: number;
          in_progress_ms: number;
          filled_ms: number;
          total_ms: number;
        };
      } = {
        ruleId: bucket.key,
        status,
        counts,
        inProgressDocs,
        latestUpdate,
      };
      extended.sums = {
        unfilled_ms: sumUnfilledMs,
        in_progress_ms: sumInProgressMs,
        filled_ms: sumFilledMs,
        total_ms: sumTotalMs,
      };
      result[bucket.key] = extended;
    }

    // For ruleIds with no buckets, set null status
    for (const id of ruleIds) {
      if (!result[id]) {
        result[id] = {
          ruleId: id,
          status: null,
          counts: { filled: 0, partially_filled: 0, unfilled: 0 },
          inProgressDocs: 0,
        };
      }
    }

    return result;
  } catch (err) {
    const errorMessage = `Failed to aggregate gap status by rule ids`;
    context.logger.error(`${errorMessage} - ${err}`);
    throw Boom.boomify(err, { message: errorMessage });
  }
}
