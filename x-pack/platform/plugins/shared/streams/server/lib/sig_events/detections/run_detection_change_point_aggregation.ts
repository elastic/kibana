/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type ResolvedDetectionAlertsSource,
  type RuleMetadata,
  V1_ALERTS_SOURCE,
  V2_ALERTS_SOURCE,
} from './detection_alerts_source';
import { ALERTS_DATA_STREAM, RULE_EVENTS_DATA_STREAM } from '../alerts_data_stream';

const RULES_BUCKET_SIZE = 1000;
const RECENT_ACTIVITY_MINUTES = 5;
const LOOKBACK_MINUTES_FLOOR = 20;

export interface ChangePointScanParams {
  lookback: string;
  bucketInterval: string;
  spaceId: string;
}

export interface ChangePointRuleBucket {
  key: string;
  doc_count: number;
  rule_name: {
    top: Array<{ metrics: Record<string, string> }>;
  };
  stream: {
    buckets: Array<{ key: string }>;
  };
  change_points: {
    type: Record<string, { p_value: number }>;
  };
  last_5m: {
    doc_count: number;
  };
  last_floor_window: {
    doc_count: number;
  };
}

export interface ChangePointScanResult extends ResolvedDetectionAlertsSource {
  aggregations: {
    by_rule: {
      buckets: ChangePointRuleBucket[];
    };
  };
}

interface RawRuleBucket {
  key: string;
  doc_count: number;
  rule_name?: { top?: Array<{ metrics?: Record<string, string> }> };
  stream?: { buckets?: Array<{ key: string }> };
  change_points?: { type?: Record<string, { p_value: number }> };
  last_5m?: { doc_count?: number };
  last_floor_window?: { doc_count?: number };
}

export async function runDetectionChangePointAggregation({
  esClient,
  resolved,
  params,
  ruleMetadata,
}: {
  esClient: ElasticsearchClient;
  resolved: ResolvedDetectionAlertsSource;
  params: ChangePointScanParams;
  ruleMetadata: Map<string, RuleMetadata>;
}): Promise<ChangePointScanResult> {
  const body =
    resolved.alertsSource === V2_ALERTS_SOURCE
      ? buildV2ScanBody(params)
      : buildV1ScanBody(params);

  const index =
    resolved.alertsSource === V2_ALERTS_SOURCE ? RULE_EVENTS_DATA_STREAM : ALERTS_DATA_STREAM;

  const response = await esClient.search({
    index,
    ignore_unavailable: true,
    size: 0,
    filter_path: '-aggregations.by_rule.buckets.over_time',
    ...body,
  });

  const rawBuckets = (response.aggregations?.by_rule as { buckets?: RawRuleBucket[] })?.buckets ?? [];

  const buckets = rawBuckets.map((bucket) => enrichBucket(bucket, ruleMetadata, resolved.alertsSource));

  return {
    ...resolved,
    aggregations: { by_rule: { buckets } },
  };
}

function buildV1ScanBody({ lookback, bucketInterval, spaceId }: ChangePointScanParams) {
  return {
    query: {
      bool: {
        filter: [
          { terms: { 'kibana.space_ids': [spaceId, '*'] } },
          { range: { '@timestamp': { gte: lookback } } },
        ],
      },
    },
    aggs: {
      by_rule: {
        terms: { field: 'kibana.alert.rule.uuid', size: RULES_BUCKET_SIZE },
        aggs: {
          rule_name: {
            top_metrics: {
              metrics: [{ field: 'kibana.alert.rule.name' }],
              sort: { '@timestamp': 'desc' },
              size: 1,
            },
          },
          stream: {
            terms: { field: 'kibana.alert.rule.tags', exclude: 'streams', size: 1 },
          },
          over_time: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: bucketInterval,
              min_doc_count: 0,
              extended_bounds: { min: lookback, max: `now-${bucketInterval}` },
            },
          },
          last_5m: {
            filter: { range: { '@timestamp': { gte: `now-${RECENT_ACTIVITY_MINUTES}m` } } },
          },
          last_floor_window: {
            filter: { range: { '@timestamp': { gte: `now-${LOOKBACK_MINUTES_FLOOR}m` } } },
          },
          change_points: {
            change_point: { buckets_path: 'over_time>_count' },
          },
        },
      },
    },
  };
}

function buildV2ScanBody({ lookback, bucketInterval, spaceId }: ChangePointScanParams) {
  return {
    query: {
      bool: {
        filter: [
          { term: { type: 'signal' } },
          { term: { space_id: spaceId } },
          { range: { '@timestamp': { gte: lookback } } },
        ],
      },
    },
    aggs: {
      by_rule: {
        terms: { field: 'rule.id', size: RULES_BUCKET_SIZE },
        aggs: {
          over_time: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: bucketInterval,
              min_doc_count: 0,
              extended_bounds: { min: lookback, max: `now-${bucketInterval}` },
            },
            aggs: {
              signal_count: {
                cardinality: { field: 'group_hash' },
              },
            },
          },
          last_5m: {
            filter: { range: { '@timestamp': { gte: `now-${RECENT_ACTIVITY_MINUTES}m` } } },
          },
          last_floor_window: {
            filter: { range: { '@timestamp': { gte: `now-${LOOKBACK_MINUTES_FLOOR}m` } } },
          },
          change_points: {
            change_point: { buckets_path: 'over_time>signal_count' },
          },
        },
      },
    },
  };
}

function enrichBucket(
  bucket: RawRuleBucket,
  ruleMetadata: Map<string, RuleMetadata>,
  alertsSource: ResolvedDetectionAlertsSource['alertsSource']
): ChangePointRuleBucket {
  const meta = ruleMetadata.get(bucket.key);
  const ruleName = meta?.ruleName ?? 'unknown';
  const streamName = meta?.streamName ?? 'unknown';
  const changePoints = bucket.change_points?.type
    ? { type: bucket.change_points.type }
    : { type: {} as Record<string, { p_value: number }> };

  if (alertsSource === V1_ALERTS_SOURCE) {
    const ruleNameAgg = bucket.rule_name?.top?.[0]?.metrics
      ? { top: [{ metrics: bucket.rule_name.top[0].metrics as Record<string, string> }] }
      : { top: [{ metrics: { 'kibana.alert.rule.name': ruleName } }] };
    const streamAgg = bucket.stream?.buckets
      ? { buckets: bucket.stream.buckets }
      : { buckets: [{ key: streamName }] };

    return {
      key: bucket.key,
      doc_count: bucket.doc_count,
      rule_name: ruleNameAgg,
      stream: streamAgg,
      change_points: changePoints,
      last_5m: { doc_count: bucket.last_5m?.doc_count ?? 0 },
      last_floor_window: { doc_count: bucket.last_floor_window?.doc_count ?? 0 },
    };
  }

  return {
    key: bucket.key,
    doc_count: bucket.doc_count,
    rule_name: { top: [{ metrics: { 'kibana.alert.rule.name': ruleName } }] },
    stream: { buckets: [{ key: streamName }] },
    change_points: changePoints,
    last_5m: { doc_count: bucket.last_5m?.doc_count ?? 0 },
    last_floor_window: { doc_count: bucket.last_floor_window?.doc_count ?? 0 },
  };
}

export async function runDetectionRuleChangePoint({
  esClient,
  resolved,
  params,
}: {
  esClient: ElasticsearchClient;
  resolved: ResolvedDetectionAlertsSource;
  params: {
    ruleUuid: string;
    lookback: string;
    bucketInterval: string;
    spaceId: string;
  };
}): Promise<{ aggregations: Record<string, unknown> }> {
  const { ruleUuid, lookback, bucketInterval, spaceId } = params;

  if (resolved.alertsSource === V2_ALERTS_SOURCE) {
    const response = await esClient.search({
      index: RULE_EVENTS_DATA_STREAM,
      ignore_unavailable: true,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { type: 'signal' } },
            { term: { space_id: spaceId } },
            { term: { 'rule.id': ruleUuid } },
            { range: { '@timestamp': { gte: lookback } } },
          ],
        },
      },
      aggs: {
        over_time: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: bucketInterval,
            min_doc_count: 0,
            extended_bounds: { min: lookback, max: `now-${bucketInterval}` },
          },
          aggs: {
            signal_count: {
              cardinality: { field: 'group_hash' },
            },
          },
        },
        last_5m: {
          filter: { range: { '@timestamp': { gte: `now-${RECENT_ACTIVITY_MINUTES}m` } } },
        },
        change_points: {
          change_point: { buckets_path: 'over_time>signal_count' },
        },
      },
    });

    return { aggregations: response.aggregations ?? {} };
  }

  const response = await esClient.search({
    index: ALERTS_DATA_STREAM,
    ignore_unavailable: true,
    size: 0,
    query: {
      bool: {
        filter: [
          { terms: { 'kibana.space_ids': [spaceId, '*'] } },
          { term: { 'kibana.alert.rule.uuid': ruleUuid } },
          { range: { '@timestamp': { gte: lookback } } },
        ],
      },
    },
    aggs: {
      over_time: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: bucketInterval,
          min_doc_count: 0,
          extended_bounds: { min: lookback, max: `now-${bucketInterval}` },
        },
      },
      last_5m: {
        filter: { range: { '@timestamp': { gte: `now-${RECENT_ACTIVITY_MINUTES}m` } } },
      },
      change_points: {
        change_point: { buckets_path: 'over_time>_count' },
      },
    },
  });

  return { aggregations: response.aggregations ?? {} };
}

export async function runDetectionRuleActivity({
  esClient,
  resolved,
  params,
}: {
  esClient: ElasticsearchClient;
  resolved: ResolvedDetectionAlertsSource;
  params: {
    ruleUuid: string;
    lookback: string;
    windowInterval: string;
    spaceId: string;
  };
}): Promise<{ aggregations: Record<string, unknown> }> {
  const { ruleUuid, lookback, windowInterval, spaceId } = params;

  if (resolved.alertsSource === V2_ALERTS_SOURCE) {
    const response = await esClient.search({
      index: RULE_EVENTS_DATA_STREAM,
      ignore_unavailable: true,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { type: 'signal' } },
            { term: { space_id: spaceId } },
            { term: { 'rule.id': ruleUuid } },
            { range: { '@timestamp': { gte: lookback } } },
          ],
        },
      },
      aggs: {
        activity_windows: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: windowInterval,
            min_doc_count: 0,
          },
          aggs: {
            signal_count: {
              cardinality: { field: 'group_hash' },
            },
          },
        },
        peak: {
          max_bucket: { buckets_path: 'activity_windows>signal_count' },
        },
      },
    });

    return { aggregations: normalizeV2ActivityAggregations(response.aggregations ?? {}) };
  }

  const response = await esClient.search({
    index: ALERTS_DATA_STREAM,
    ignore_unavailable: true,
    size: 0,
    query: {
      bool: {
        filter: [
          { terms: { 'kibana.space_ids': [spaceId, '*'] } },
          { term: { 'kibana.alert.rule.uuid': ruleUuid } },
          { range: { '@timestamp': { gte: lookback } } },
        ],
      },
    },
    aggs: {
      activity_windows: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: windowInterval,
          min_doc_count: 0,
        },
      },
      peak: {
        max_bucket: { buckets_path: 'activity_windows._count' },
      },
    },
  });

  return { aggregations: response.aggregations ?? {} };
}

function normalizeV2ActivityAggregations(aggregations: Record<string, unknown>): Record<string, unknown> {
  const activityWindows = aggregations.activity_windows as
    | { buckets?: Array<{ key: string; signal_count?: { value?: number } }> }
    | undefined;

  if (!activityWindows?.buckets) {
    return aggregations;
  }

  return {
    ...aggregations,
    activity_windows: {
      buckets: activityWindows.buckets.map((bucket) => ({
        key: bucket.key,
        doc_count: bucket.signal_count?.value ?? 0,
      })),
    },
  };
}

export async function runDetectionRuleAlertWindows({
  esClient,
  resolved,
  params,
}: {
  esClient: ElasticsearchClient;
  resolved: ResolvedDetectionAlertsSource;
  params: {
    ruleUuid: string;
    currentLookback: string;
    referenceLookbackGte: string;
    referenceLookbackLt: string;
    spaceId: string;
  };
}): Promise<{ aggregations: Record<string, unknown> }> {
  const { ruleUuid, currentLookback, referenceLookbackGte, referenceLookbackLt, spaceId } = params;

  if (resolved.alertsSource === V2_ALERTS_SOURCE) {
    const response = await esClient.search({
      index: RULE_EVENTS_DATA_STREAM,
      ignore_unavailable: true,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { type: 'signal' } },
            { term: { space_id: spaceId } },
            { term: { 'rule.id': ruleUuid } },
          ],
        },
      },
      aggs: {
        current_window: {
          filter: { range: { '@timestamp': { gte: currentLookback } } },
        },
        reference_window: {
          filter: {
            range: {
              '@timestamp': { gte: referenceLookbackGte, lt: referenceLookbackLt },
            },
          },
        },
      },
    });

    return { aggregations: response.aggregations ?? {} };
  }

  const response = await esClient.search({
    index: ALERTS_DATA_STREAM,
    ignore_unavailable: true,
    size: 0,
    query: {
      bool: {
        filter: [
          { terms: { 'kibana.space_ids': [spaceId, '*'] } },
          { term: { 'kibana.alert.rule.uuid': ruleUuid } },
        ],
      },
    },
    aggs: {
      current_window: {
        filter: { range: { '@timestamp': { gte: currentLookback } } },
      },
      reference_window: {
        filter: {
          range: {
            '@timestamp': { gte: referenceLookbackGte, lt: referenceLookbackLt },
          },
        },
      },
    },
  });

  return { aggregations: response.aggregations ?? {} };
}
