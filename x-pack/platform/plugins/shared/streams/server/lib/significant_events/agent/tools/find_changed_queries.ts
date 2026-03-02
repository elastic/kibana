/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsTermsAggregateBase } from '@elastic/elasticsearch/lib/api/types';
import { calculateAuto } from '@kbn/calculate-auto';
import type { ChangePointType } from '@kbn/es-types/src';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import { get, isArray } from 'lodash';
import moment from 'moment';
import { z } from '@kbn/zod';
import type { SignificantEventsAgentToolDependencies } from '../tool_dependencies';
import { STREAMS_TOOL_IDS } from './constants';

const ALERTS_INDEX = '.alerts-streams.alerts-default';
const TARGET_BUCKETS = 20;

/** Change point types that indicate "no change" — exclude these when deciding if a rule changed. */
const NO_CHANGE_TYPES: Set<string> = new Set(['stationary', 'indeterminable']);
/** Human‑readable order for change types when multiple are present (primary first). */
const CHANGE_TYPE_PRIORITY: string[] = [
  'spike',
  'dip',
  'step_change',
  'trend_change',
  'distribution_change',
  'non_stationary',
];

const timeRangeSchema = z.object({
  from: z.string().describe('Start of range (e.g. ISO timestamp).'),
  to: z.string().describe('End of range (e.g. ISO timestamp).'),
});

export const FIND_CHANGED_QUERIES_TOOL_ID = STREAMS_TOOL_IDS.find_changed_queries;

const schema = z.object({
  time_range: timeRangeSchema.describe(
    'Required time window to analyze. For baseline comparison use compare_to_baseline.'
  ),
  streams: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of stream names to limit the analysis to. When omitted or empty, all streams the user has access to are considered.'
    ),
});

export interface ChangedRule {
  rule_id: string;
  rule_name: string;
  rule_query: string;
  change_type: string;
  alert_count: number;
  alert_percentage: number;
}

export interface FindChangedQueriesResult {
  changed: ChangedRule[];
  changed_count: number;
  stable_count: number;
  /** Total alert count in the window across all rules in scope (changed + stable). Not deduplicated. */
  total_alert_count: number;
}

/**
 * Compute fixed_interval for date_histogram using @kbn/calculate-auto (aiming for ~TARGET_BUCKETS).
 * Returns a string like "30s" or "2h" for Elasticsearch date_histogram.
 */
function bucketIntervalForRange(from: string, to: string): string {
  const duration = moment.duration(moment(to).valueOf() - moment(from).valueOf(), 'ms');
  const bucketDuration = calculateAuto.atLeast(TARGET_BUCKETS, duration);
  const ms = bucketDuration?.asMilliseconds() ?? 1000;
  return `${Math.max(1, ms)}ms`;
}

function hasAnyChangePoint(changePoints: { type?: Record<string, unknown> } | null): boolean {
  const types = changePoints?.type;
  if (!types || typeof types !== 'object') return false;
  return Object.keys(types).some((k) => !NO_CHANGE_TYPES.has(k));
}

/**
 * Extract change type(s) from ES change_point response, ordered by priority.
 * Returns a single string (e.g. "spike" or "spike,trend_change") for rich context.
 */
function getChangeTypeLabel(changePoints: { type?: Record<string, unknown> } | null): string {
  const types = changePoints?.type;
  if (!types || typeof types !== 'object') return 'change';
  const detected = Object.keys(types).filter((k) => !NO_CHANGE_TYPES.has(k));
  if (detected.length === 0) return 'change';
  const ordered = [...detected].sort(
    (a, b) =>
      (CHANGE_TYPE_PRIORITY.indexOf(a) === -1 ? 999 : CHANGE_TYPE_PRIORITY.indexOf(a)) -
      (CHANGE_TYPE_PRIORITY.indexOf(b) === -1 ? 999 : CHANGE_TYPE_PRIORITY.indexOf(b))
  );
  return ordered.join(',');
}

export const getFindChangedQueriesTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: FIND_CHANGED_QUERIES_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Detect which rules had a significant change in alert rate within the requested time_range using change point detection. Always loads streams the user has access to; optionally filter by streams. Returns only changed rules: each with rule_id, rule_name, rule_query, change_type (e.g. spike, dip, step_change), alert_count and alert_percentage. Also returns changed_count, stable_count, total_alert_count (alerts in window across all rules). When nothing changed, changed is empty and counts indicate stable rules; consider a wider time_range or compare_to_baseline.',
  tags: [],
  schema,
  handler: async (input, context) => {
    const { time_range: timeRange } = input;
    const { queryClient, scopedClusterClient, streamsClient } = await deps.getScopedClients({
      request: context.request,
    });
    const esClient = scopedClusterClient.asCurrentUser;
    const signal = (context as { signal?: AbortSignal }).signal;

    const allStreams = await streamsClient.listStreams();
    const allowedNames = new Set(allStreams.map((s) => s.name));
    const requestedStreams = input.streams ?? [];
    const streamNames =
      requestedStreams.length > 0
        ? requestedStreams.filter((name) => allowedNames.has(name))
        : Array.from(allowedNames);

    const queryLinks = await queryClient.getQueryLinks(streamNames);
    if (queryLinks.length === 0) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: emptyResult(),
          },
        ],
      };
    }

    const ruleIds = queryLinks.map((l) => l.rule_id);
    const linkByRuleId = new Map(queryLinks.map((l) => [l.rule_id, l]));
    const bucketInterval = bucketIntervalForRange(timeRange.from, timeRange.to);

    deps.logger.debug(
      `find_changed_queries streams=${streamNames.length} rules=${ruleIds.length} interval=${bucketInterval}`
    );

    const response = await esClient.search<
      unknown,
      {
        by_rule: AggregationsTermsAggregateBase<{
          key: string;
          doc_count: number;
          occurrences: unknown;
          change_points: {
            type?: Record<ChangePointType, { p_value?: number; change_point?: number }>;
          };
        }>;
      }
    >(
      {
        index: ALERTS_INDEX,
        size: 0,
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': { gte: timeRange.from, lte: timeRange.to },
                },
              },
              { terms: { 'kibana.alert.rule.uuid': ruleIds } },
            ],
          },
        },
        aggs: {
          by_rule: {
            terms: { field: 'kibana.alert.rule.uuid', size: 10_000 },
            aggs: {
              occurrences: {
                date_histogram: {
                  field: '@timestamp',
                  fixed_interval: bucketInterval,
                  extended_bounds: { min: timeRange.from, max: timeRange.to },
                },
              },
              change_points: {
                change_point: { buckets_path: 'occurrences>_count' },
              } as Record<string, unknown>,
            },
          },
        },
      },
      { signal }
    );

    const buckets = get(response, 'aggregations.by_rule.buckets');
    const changed: ChangedRule[] = [];
    let totalAlertCount = 0;
    let stableCount = 0;

    if (isArray(buckets)) {
      for (const bucket of buckets) {
        const ruleId = bucket.key as string;
        const docCount = bucket.doc_count ?? 0;
        totalAlertCount += docCount;
        const changePoints = get(bucket, 'change_points');
        if (hasAnyChangePoint(changePoints)) {
          const link = linkByRuleId.get(ruleId);
          const q = link?.query;
          const ruleName = q?.title ?? link?.['asset.id'] ?? ruleId;
          const ruleQuery = q?.esql?.query ?? q?.kql?.query ?? '';
          changed.push({
            rule_id: ruleId,
            rule_name: ruleName,
            rule_query: ruleQuery,
            change_type: getChangeTypeLabel(changePoints),
            alert_count: docCount,
            alert_percentage: 0,
          });
        } else {
          stableCount += 1;
        }
      }

      const total = totalAlertCount;
      changed.forEach((r) => {
        r.alert_percentage = total > 0 ? Math.round((r.alert_count / total) * 100 * 100) / 100 : 0;
      });
    }

    const result: FindChangedQueriesResult = {
      changed,
      changed_count: changed.length,
      stable_count: stableCount,
      total_alert_count: totalAlertCount,
    };

    deps.logger.debug(
      `find_changed_queries changed_count=${result.changed_count} stable_count=${result.stable_count} total_alert_count=${totalAlertCount}`
    );

    return {
      results: [{ type: ToolResultType.other, data: result }],
    };
  },
});

function emptyResult(): FindChangedQueriesResult {
  return {
    changed: [],
    changed_count: 0,
    stable_count: 0,
    total_alert_count: 0,
  };
}
