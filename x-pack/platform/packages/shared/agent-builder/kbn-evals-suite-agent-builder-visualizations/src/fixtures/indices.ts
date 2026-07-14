/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesCreateRequest,
  IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';

/**
 * Self-contained TSDB fixture reproducing the OTel host-metrics failure
 * captured in dashboard-level evals: the agent generated a `TS` query over
 * `system.cpu.load_average.*` gauges but produced ES|QL that failed to parse
 * (unquoted `.1m` field names lexed as numeric literals) and, after fixing
 * that, failed to execute because no such index existed in the eval cluster.
 *
 * The `metrics-` prefix and `time_series_metric: gauge` fields are required
 * for `TS ... | STATS AVG(AVG_OVER_TIME(field))` to be a valid query: the
 * `TS` source command only works on time-series indices, and the
 * `*_OVER_TIME` inner aggregations only apply to metric-typed fields.
 *
 * `host.name` is the single time-series dimension. The `time_series.start_time`
 * / `end_time` window bounds the accepted `@timestamp` range and must cover
 * every seeded document (see `./documents.ts`).
 */
export const OTEL_METRICS_INDEX = 'metrics-hostmetricsreceiver.otel-default';

/**
 * TSDB `@timestamp` window slack around the seeded documents. The index's
 * `time_series.start_time` / `end_time` must bracket every seeded document
 * (see `./documents.ts`) or ingestion is rejected with `time series out of
 * bounds`. Documents span the last {@link OTEL_METRICS_SAMPLE_HOURS} hours,
 * so a couple of days back plus a small look-ahead is ample.
 */
const TIME_SERIES_LOOKBACK_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
const TIME_SERIES_LOOKAHEAD_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Name of the override index template that lets us create
 * `metrics-hostmetricsreceiver.otel-default` as a plain index.
 *
 * Elasticsearch ships a managed `metrics-otel@template` (matching
 * `metrics-*.otel-*`, priority 120) that only creates *data streams* — a bare
 * `indices.create` for our index name is rejected with
 * `illegal_argument_exception: ... creates data streams only`. We register a
 * higher-priority (500) template with no `data_stream` block scoped to the
 * exact index name so the plain TSDB index below can be created and fully
 * controls its own mappings (matching the field paths the gold query uses).
 */
export const OTEL_METRICS_OVERRIDE_TEMPLATE_NAME = 'viz-evals-otel-metrics@template';

export const otelMetricsOverrideTemplate: IndicesPutIndexTemplateRequest = {
  name: OTEL_METRICS_OVERRIDE_TEMPLATE_NAME,
  index_patterns: [OTEL_METRICS_INDEX],
  priority: 500,
};

/**
 * Build the TSDB index-create request with a now-relative `@timestamp`
 * window so it always brackets the now-relative seeded documents.
 */
export function buildOtelMetricsIndexCreateRequest(now: number = Date.now()): IndicesCreateRequest {
  return {
    index: OTEL_METRICS_INDEX,
    settings: {
      index: {
        mode: 'time_series',
        routing_path: ['host.name'],
        time_series: {
          start_time: new Date(now - TIME_SERIES_LOOKBACK_MS).toISOString(),
          end_time: new Date(now + TIME_SERIES_LOOKAHEAD_MS).toISOString(),
        },
      },
    },
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        host: {
          properties: {
            name: { type: 'keyword', time_series_dimension: true },
          },
        },
        system: {
          properties: {
            cpu: {
              properties: {
                load_average: {
                  properties: {
                    '1m': { type: 'double', time_series_metric: 'gauge' },
                    '5m': { type: 'double', time_series_metric: 'gauge' },
                    '15m': { type: 'double', time_series_metric: 'gauge' },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

/**
 * Wildcard patterns covering every fixture index, used by cleanup. Scout
 * clusters boot with `action.destructive_requires_name=true`, so cleanup
 * resolves these patterns to concrete names before deleting.
 */
export const otelMetricsFixtureIndexWildcards: readonly string[] = [
  'metrics-hostmetricsreceiver.*',
];
