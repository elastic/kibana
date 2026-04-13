/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsSingleMetricAggregateBase,
  AggregationsStatsAggregate,
  AggregationsTermsAggregateBase,
  AggregationsStringTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getProviderAndActionFilterForTimeRange } from './get_telemetry_from_event_log';
import { parseSimpleRuleTypeBucket } from './parse_simple_rule_type_bucket';
import { parseAndLogError } from './parse_and_log_error';

interface Opts {
  esClient: ElasticsearchClient;
  eventLogIndex: string;
  logger: Logger;
}

export interface GapAutoFillSchedulerTelemetry {
  hasErrors: boolean;
  errorMessage?: string;
  runsTotal: number;
  runsByStatus: Record<string, number>;
  durationMs: {
    min: number;
    max: number;
    avg: number;
    sum: number;
  };
  uniqueRuleCount: number;
  processedGapsTotal: number;
  resultsByStatus: Record<string, number>;
}

export async function getGapAutoFillSchedulerTelemetryPerDay({
  esClient,
  eventLogIndex,
  logger,
}: Opts): Promise<GapAutoFillSchedulerTelemetry> {
  try {
    const query = {
      index: eventLogIndex,
      size: 0,
      track_total_hits: true,
      query: getProviderAndActionFilterForTimeRange('gap-auto-fill-schedule'),
      aggs: {
        by_status: {
          terms: {
            field: 'kibana.gap_auto_fill.execution.status',
          },
        },
        duration_ms: {
          stats: {
            field: 'kibana.gap_auto_fill.execution.duration_ms',
          },
        },
        unique_rule_count: {
          cardinality: {
            field: 'kibana.gap_auto_fill.execution.rule_ids',
          },
        },
        results_nested: {
          nested: { path: 'kibana.gap_auto_fill.execution.results' },
          aggs: {
            processed_gaps_total: {
              sum: { field: 'kibana.gap_auto_fill.execution.results.processed_gaps' },
            },
            by_result_status: {
              terms: { field: 'kibana.gap_auto_fill.execution.results.status' },
            },
          },
        },
      },
    } as const;

    const results = await esClient.search(query);

    const totalRuns =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    const aggregations = results.aggregations as {
      by_status: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      duration_ms: AggregationsStatsAggregate;
      unique_rule_count: AggregationsSingleMetricAggregateBase;
      results_nested: {
        doc_count: number;
        processed_gaps_total: AggregationsSingleMetricAggregateBase;
        by_result_status: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
      };
    };

    const runsByStatus = parseSimpleRuleTypeBucket(aggregations.by_status.buckets);
    const resultsByStatus = parseSimpleRuleTypeBucket(
      aggregations.results_nested.by_result_status.buckets
    );

    return {
      hasErrors: false,
      runsTotal: totalRuns ?? 0,
      runsByStatus,
      durationMs: {
        min: aggregations.duration_ms.min ?? 0,
        max: aggregations.duration_ms.max ?? 0,
        avg: aggregations.duration_ms.avg ?? 0,
        sum: aggregations.duration_ms.sum ?? 0,
      },
      uniqueRuleCount: aggregations.unique_rule_count.value ?? 0,
      processedGapsTotal: aggregations.results_nested.processed_gaps_total.value ?? 0,
      resultsByStatus,
    };
  } catch (err) {
    const errorMessage = parseAndLogError(err, `getGapAutoFillSchedulerTelemetryPerDay`, logger);

    return {
      hasErrors: true,
      errorMessage,
      runsTotal: 0,
      runsByStatus: {},
      durationMs: { min: 0, max: 0, avg: 0, sum: 0 },
      uniqueRuleCount: 0,
      processedGapsTotal: 0,
      resultsByStatus: {},
    };
  }
}
