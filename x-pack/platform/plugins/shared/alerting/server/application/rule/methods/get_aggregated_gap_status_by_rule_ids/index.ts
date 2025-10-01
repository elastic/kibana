/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClientContext } from '../../../../rules_client';
import {
  buildBaseGapsFilter,
  resolveTimeRange,
  extractGapDurationSums,
  calculateAggregatedGapStatus,
  COMMON_GAP_AGGREGATIONS,
  type GapDurationBucket,
} from './gap_helpers';
import type { AggregatedGapStatus } from '../../../../../common/constants';
export interface RuleGapStatusSummary {
  ruleId: string;
  status: AggregatedGapStatus | null;
  counts: { filled: number; partially_filled: number; unfilled: number };
  inProgressDocs: number;
  latestUpdate?: string;
}

export interface GetAggregatedGapStatusByRuleIdsParams {
  ruleIds: string[];
  timeRange?: { from: string; to: string };
}

interface ByRuleBucket extends GapDurationBucket {
  key: string; // rule.id
  doc_count: number;
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
            ...COMMON_GAP_AGGREGATIONS,
            latest_update: { max: { field: '@timestamp' } },
          },
        },
      },
    });

    const byRuleAgg = aggs.aggregations?.by_rule as unknown as
      | { buckets: ByRuleBucket[] }
      | undefined;
    const byRule = byRuleAgg?.buckets ?? [];

    const result: Record<string, RuleGapStatusSummary> = {};

    for (const bucket of byRule) {
      const sums = extractGapDurationSums(bucket);
      const status = calculateAggregatedGapStatus(sums);

      const latestUpdate = bucket.latest_update?.value
        ? new Date(bucket.latest_update.value).toISOString()
        : undefined;

      // keep legacy fields for backwards compatibility
      const counts = {
        filled: sums.sumFilledMs > 0 ? 1 : 0,
        partially_filled: 0,
        unfilled: sums.sumUnfilledMs > 0 ? 1 : 0,
      };
      const inProgressDocs = sums.sumInProgressMs > 0 ? 1 : 0;

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
        unfilled_ms: sums.sumUnfilledMs,
        in_progress_ms: sums.sumInProgressMs,
        filled_ms: sums.sumFilledMs,
        total_ms: sums.sumTotalMs ?? 0,
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
