/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto } from '@kbn/calculate-auto';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import { get, isArray } from 'lodash';
import moment from 'moment';
import { z } from '@kbn/zod';
import type { SignificantEventsAgentToolDependencies } from '../tool_dependencies';
import { STREAMS_TOOL_IDS } from './constants';

const ALERTS_INDEX = '.alerts-streams.alerts-default';
const TARGET_BUCKETS = 20;
const DEFAULT_MIN_CLUSTER_SIZE = 5;

const timeRangeSchema = z.object({
  from: z.string().describe('Start of window (e.g. ISO timestamp).'),
  to: z.string().describe('End of window (e.g. ISO timestamp).'),
});
const resolutionSchema = z.enum(['auto', 'fine', 'coarse']).optional().default('auto');

export const CLUSTER_BY_TIME_TOOL_ID = STREAMS_TOOL_IDS.cluster_by_time;

const schema = z.object({
  time_range: timeRangeSchema.describe(
    'Required time window to analyze (e.g. the last hour). Clustering is limited to this range.'
  ),
  rule_ids: z
    .array(z.string())
    .min(1)
    .describe(
      'Required. Rule UUIDs to cluster (e.g. from find_changed_queries). Only these rules are included; stable/noisy rules are not clustered.'
    ),
  resolution: resolutionSchema.describe('Cluster granularity: auto, fine, or coarse.'),
  min_cluster_size: z
    .number()
    .optional()
    .default(DEFAULT_MIN_CLUSTER_SIZE)
    .describe('Minimum alerts to form a cluster.'),
});

export interface RuleInWindow {
  rule_id: string;
  rule_name: string;
  rule_query: string;
  alert_count: number;
}

export interface TimeCluster {
  cluster_id: string;
  start: string;
  end: string;
  alert_count: number;
  rule_ids: RuleInWindow[];
  peak_rate: number;
}

export interface ClusterByTimeResult {
  clusters: TimeCluster[];
}

/**
 * Compute fixed_interval for date_histogram. Uses resolution: auto = TARGET_BUCKETS, fine = 2x buckets, coarse = 0.5x buckets.
 */
function bucketIntervalForRange(
  from: string,
  to: string,
  resolution: 'auto' | 'fine' | 'coarse'
): string {
  const duration = moment.duration(moment(to).valueOf() - moment(from).valueOf(), 'ms');
  let targetBuckets = TARGET_BUCKETS;
  if (resolution === 'fine') targetBuckets = TARGET_BUCKETS * 2;
  if (resolution === 'coarse') targetBuckets = Math.max(5, Math.floor(TARGET_BUCKETS / 2));
  const bucketDuration = calculateAuto.atLeast(targetBuckets, duration);
  const ms = bucketDuration?.asMilliseconds() ?? 1000;
  return `${Math.max(1, ms)}ms`;
}

interface HistogramBucket {
  key_as_string?: string;
  key: number;
  doc_count: number;
  by_rule?: { buckets?: Array<{ key: string; doc_count: number }> };
}

/**
 * Find indices of local maxima (peaks) in the count series.
 * A plateau is treated as one peak (rightmost index) so we don't split on flat tops.
 */
function findPeakIndices(counts: number[]): number[] {
  const n = counts.length;
  if (n === 0) return [];
  const peaks: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = counts[i];
    const leftOk = i === 0 || c >= counts[i - 1];
    const rightOk = i === n - 1 || c > counts[i + 1];
    if (leftOk && rightOk) peaks.push(i);
  }
  return peaks;
}

/**
 * Between two peak indices, return the bucket index with minimum count (valley).
 * If there is no gap (adjacent peaks), return the later peak so boundaries don't overlap.
 */
function valleyBetween(counts: number[], p1: number, p2: number): number {
  if (p2 <= p1 + 1) return p2;
  let minIdx = p1 + 1;
  let minVal = counts[minIdx];
  for (let i = p1 + 2; i < p2; i++) {
    if (counts[i] < minVal) {
      minVal = counts[i];
      minIdx = i;
    }
  }
  return minIdx;
}

/**
 * Cluster the timeline by peaks: each cluster is "elevated activity around a peak",
 * with boundaries at the valleys (local minima) between consecutive peaks.
 * This avoids one big cluster when activity is continuous; we only split where
 * the rate meaningfully dips (valley) between two peaks.
 */
function segmentBucketsIntoClusters(
  buckets: HistogramBucket[],
  bucketIntervalMs: number,
  minClusterSize: number
): Array<{
  start: number;
  end: number;
  alertCount: number;
  ruleCounts: Map<string, number>;
  maxCount: number;
}> {
  if (buckets.length === 0) return [];

  const n = buckets.length;
  const counts = buckets.map((b) => b.doc_count ?? 0);
  const peaks = findPeakIndices(counts);
  if (peaks.length === 0) return [];

  const boundaries: number[] = [0];
  for (let j = 0; j < peaks.length - 1; j++) {
    boundaries.push(valleyBetween(counts, peaks[j], peaks[j + 1]));
  }
  boundaries.push(n);

  const segments: Array<{
    start: number;
    end: number;
    alertCount: number;
    ruleCounts: Map<string, number>;
    maxCount: number;
  }> = [];

  for (let j = 0; j < peaks.length; j++) {
    const startIdx = boundaries[j];
    const endIdx = boundaries[j + 1] - 1;
    if (endIdx < startIdx) continue;

    let alertCount = 0;
    const ruleCounts = new Map<string, number>();
    let maxCount = 0;

    for (let i = startIdx; i <= endIdx; i++) {
      const bucket = buckets[i];
      const count = bucket.doc_count ?? 0;
      alertCount += count;
      if (count > maxCount) maxCount = count;
      const ruleBuckets = bucket.by_rule?.buckets;
      if (isArray(ruleBuckets)) {
        for (const b of ruleBuckets) {
          ruleCounts.set(String(b.key), (ruleCounts.get(String(b.key)) ?? 0) + b.doc_count);
        }
      }
    }

    if (alertCount >= minClusterSize) {
      segments.push({
        start: buckets[startIdx].key,
        end: buckets[endIdx].key,
        alertCount,
        ruleCounts,
        maxCount,
      });
    }
  }

  return segments;
}

export const getClusterByTimeTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: CLUSTER_BY_TIME_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Identify time-based Incident Windows (the "Arena") within a required time_range and for required rule_ids (e.g. from find_changed_queries). Only the given rules are clustered, so stable/noisy rules are not included. Returns clusters with cluster_id, start, end, alert_count, rule_ids with rule name and query per window, peak_rate. Use after find_changed_queries; then use group_within_window within a chosen window.',
  tags: [],
  schema,
  handler: async (input, context) => {
    const { queryClient, scopedClusterClient, streamsClient } = await deps.getScopedClients({
      request: context.request,
    });
    const esClient = scopedClusterClient.asCurrentUser;
    const signal = (context as { signal?: AbortSignal }).signal;

    const { from, to } = input.time_range;

    const allStreams = await streamsClient.listStreams();
    const streamNames = allStreams.map((s) => s.name);
    const queryLinks = await queryClient.getQueryLinks(streamNames);
    const linkByRuleId = new Map(queryLinks.map((l) => [l.rule_id, l]));

    const ruleIds = input.rule_ids.filter((id) => linkByRuleId.has(id));
    if (ruleIds.length === 0) {
      return {
        results: [{ type: ToolResultType.other, data: emptyResult() }],
      };
    }

    const bucketInterval = bucketIntervalForRange(from, to, input.resolution);
    const bucketDurationMs = moment.duration(bucketInterval).asMilliseconds() || 1;

    deps.logger.debug(
      `cluster_by_time rules=${ruleIds.length} interval=${bucketInterval} from=${from} to=${to}`
    );

    const response = await esClient.search<
      unknown,
      {
        over_time: {
          buckets: HistogramBucket[];
        };
      }
    >(
      {
        index: ALERTS_INDEX,
        size: 0,
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: from, lte: to } } },
              { terms: { 'kibana.alert.rule.uuid': ruleIds } },
            ],
          },
        },
        aggs: {
          over_time: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: bucketInterval,
              extended_bounds: { min: from, max: to },
            },
            aggs: {
              by_rule: {
                terms: { field: 'kibana.alert.rule.uuid', size: 10_000 },
              },
            },
          },
        },
      },
      { signal }
    );

    const buckets = get(response, 'aggregations.over_time.buckets') as
      | HistogramBucket[]
      | undefined;
    const timeOrderedBuckets = isArray(buckets) ? buckets : [];
    const minClusterSize = input.min_cluster_size ?? DEFAULT_MIN_CLUSTER_SIZE;
    const segments = segmentBucketsIntoClusters(
      timeOrderedBuckets,
      bucketDurationMs,
      minClusterSize
    );

    const clusters: TimeCluster[] = segments.map((seg, idx) => {
      const ruleIdsInSegment = Array.from(seg.ruleCounts.keys());
      const rulesInWindow: RuleInWindow[] = ruleIdsInSegment.map((ruleId) => {
        const link = linkByRuleId.get(ruleId);
        const q = link?.query;
        const ruleName = q?.title ?? link?.['asset.id'] ?? ruleId;
        const ruleQuery = q?.esql?.query ?? q?.kql?.query ?? '';
        return {
          rule_id: ruleId,
          rule_name: ruleName,
          rule_query: ruleQuery,
          alert_count: seg.ruleCounts.get(ruleId) ?? 0,
        };
      });
      const startIso = new Date(seg.start).toISOString();
      const endIso = new Date(seg.end + bucketDurationMs).toISOString();
      const peakRate = bucketDurationMs > 0 ? seg.maxCount / (bucketDurationMs / 1000) : 0;
      return {
        cluster_id: `window_${idx + 1}`,
        start: startIso,
        end: endIso,
        alert_count: seg.alertCount,
        rule_ids: rulesInWindow,
        peak_rate: Math.round(peakRate * 100) / 100,
      };
    });

    const result: ClusterByTimeResult = { clusters };

    deps.logger.debug(`cluster_by_time clusters=${result.clusters.length}`);

    return {
      results: [{ type: ToolResultType.other, data: result }],
    };
  },
});

function emptyResult(): ClusterByTimeResult {
  return { clusters: [] };
}
