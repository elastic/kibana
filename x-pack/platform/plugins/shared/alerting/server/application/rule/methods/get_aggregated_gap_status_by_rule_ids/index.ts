/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { RulesClientContext } from '../../../../rules_client';
import { buildGapsFilter } from '../../../../lib/rule_gaps/build_gaps_filter';

export type AggregatedGapStatus = 'IN_PROGRESS' | 'UNFILLED' | 'FILLED' | null;

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

function toAggregatedStatus(
  counts: { filled: number; partially_filled: number; unfilled: number },
  inProgressDocs: number
): AggregatedGapStatus {
  const total = counts.filled + counts.partially_filled + counts.unfilled;
  if (total === 0) return null;
  if (counts.unfilled > 0 || counts.partially_filled > 0) return 'UNFILLED';
  if (inProgressDocs > 0) return 'IN_PROGRESS';
  return 'FILLED';
}

interface StatusCountsAgg {
  buckets: Record<string, { doc_count: number }>; // filled, partially_filled, unfilled
}

interface ByRuleBucket {
  key: string; // rule.id
  doc_count: number;
  status_counts: StatusCountsAgg;
  has_in_progress: { doc_count: number };
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

    const now = new Date();
    const fromDefault = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const toDefault = now.toISOString();
    const from = params.timeRange?.from ?? fromDefault;
    const to = params.timeRange?.to ?? toDefault;

    // Base KQL filter for gaps with deleted:false plus time range
    const baseFilter = buildGapsFilter({ start: from, end: to });
    const filter = `${baseFilter} AND kibana.alert.rule.gap.status: *`;

    const eventLogClient = await context.getEventLogClient();

    const aggs = await eventLogClient.aggregateEventsBySavedObjectIds('alert', ruleIds, {
      filter,
      aggs: {
        by_rule: {
          terms: { field: 'rule.id', size: 10000, order: { _key: 'asc' } },
          aggs: {
            status_counts: {
              filters: {
                filters: {
                  filled: { term: { 'kibana.alert.rule.gap.status': 'filled' } },
                  partially_filled: {
                    term: { 'kibana.alert.rule.gap.status': 'partially_filled' },
                  },
                  unfilled: { term: { 'kibana.alert.rule.gap.status': 'unfilled' } },
                },
              },
            },
            has_in_progress: {
              filter: { exists: { field: 'kibana.alert.rule.gap.in_progress_intervals' } },
            },
            latest_update: { max: { field: '@timestamp' } },
          },
        },
      },
    });

    const byRule = (aggs.aggregations?.by_rule?.buckets as unknown as ByRuleBucket[]) ?? [];

    const result: Record<string, RuleGapStatusSummary> = {};

    for (const bucket of byRule) {
      const counts = {
        filled: bucket.status_counts?.buckets?.filled?.doc_count ?? 0,
        partially_filled: bucket.status_counts?.buckets?.partially_filled?.doc_count ?? 0,
        unfilled: bucket.status_counts?.buckets?.unfilled?.doc_count ?? 0,
      };
      const inProgressDocs = bucket.has_in_progress?.doc_count ?? 0;
      const status = toAggregatedStatus(counts, inProgressDocs);
      const latestUpdate = bucket.latest_update?.value
        ? new Date(bucket.latest_update.value).toISOString()
        : undefined;

      result[bucket.key] = {
        ruleId: bucket.key,
        status,
        counts,
        inProgressDocs,
        latestUpdate,
      };
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
