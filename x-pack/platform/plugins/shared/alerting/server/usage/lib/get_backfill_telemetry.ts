/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsSingleMetricAggregateBase,
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

interface GetBackfillTelemetryPerDayCountResults {
  hasErrors: boolean;
  errorMessage?: string;
  countExecutions: number;
  countBackfillsByExecutionStatus: Record<string, number>;
  countGaps: number;
  totalUnfilledGapDurationMs: number;
  totalFilledGapDurationMs: number;
}

interface GetBackfillExecutionsPerDayCountResults {
  hasErrors: boolean;
  errorMessage?: string;
  countExecutions: number;
  countBackfillsByExecutionStatus: Record<string, number>;
}

interface GetGapDataPerDayCountResults {
  hasErrors: boolean;
  errorMessage?: string;
  countGaps: number;
  totalUnfilledGapDurationMs: number;
  totalFilledGapDurationMs: number;
}

async function getBackfillExecutionCount({
  esClient,
  eventLogIndex,
  logger,
}: Opts): Promise<GetBackfillExecutionsPerDayCountResults> {
  try {
    const query = {
      index: eventLogIndex,
      size: 0,
      track_total_hits: true,
      query: getProviderAndActionFilterForTimeRange('execute-backfill'),
      aggs: {
        by_execution_status: {
          terms: {
            field: 'event.outcome',
          },
        },
      },
    };

    const results = await esClient.search(query);

    const totalBackfillExecutions =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    const aggregations = results.aggregations as {
      by_execution_status: AggregationsTermsAggregateBase<AggregationsStringTermsBucketKeys>;
    };

    return {
      hasErrors: false,
      countExecutions: totalBackfillExecutions ?? 0,
      countBackfillsByExecutionStatus: parseSimpleRuleTypeBucket(
        aggregations.by_execution_status.buckets
      ),
    };
  } catch (err) {
    const errorMessage = parseAndLogError(err, `getBackfillExecutionCount`, logger);

    return {
      hasErrors: true,
      errorMessage,
      countExecutions: 0,
      countBackfillsByExecutionStatus: {},
    };
  }
}

async function getGapInfo({
  esClient,
  eventLogIndex,
  logger,
}: Opts): Promise<GetGapDataPerDayCountResults> {
  try {
    const query = {
      index: eventLogIndex,
      track_total_hits: true,
      size: 0,
      query: getProviderAndActionFilterForTimeRange('gap'),
      aggs: {
        total_unfilled_duration_ms: {
          sum: { field: 'kibana.alert.rule.gap.unfilled_duration_ms' },
        },
        total_filled_duration_ms: {
          sum: { field: 'kibana.alert.rule.gap.filled_duration_ms' },
        },
      },
    };

    const results = await esClient.search(query);

    const totalGapsReported =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total?.value;

    const aggregations = results.aggregations as {
      total_unfilled_duration_ms: AggregationsSingleMetricAggregateBase;
      total_filled_duration_ms: AggregationsSingleMetricAggregateBase;
    };

    return {
      hasErrors: false,
      countGaps: totalGapsReported ?? 0,
      totalUnfilledGapDurationMs: aggregations.total_unfilled_duration_ms.value ?? 0,
      totalFilledGapDurationMs: aggregations.total_filled_duration_ms.value ?? 0,
    };
  } catch (err) {
    const errorMessage = parseAndLogError(err, `getGapInfo`, logger);

    return {
      hasErrors: true,
      errorMessage,
      countGaps: 0,
      totalUnfilledGapDurationMs: 0,
      totalFilledGapDurationMs: 0,
    };
  }
}

export async function getBackfillTelemetryPerDay(
  opts: Opts
): Promise<GetBackfillTelemetryPerDayCountResults> {
  const backfillResults = await getBackfillExecutionCount(opts);
  const gapResults = await getGapInfo(opts);

  const errorMessage = [backfillResults.errorMessage, gapResults.errorMessage]
    .filter((message) => !!message)
    .join(',');

  return {
    hasErrors: backfillResults.hasErrors || gapResults.hasErrors,
    ...(errorMessage ? { errorMessage } : {}),
    countExecutions: backfillResults.countExecutions,
    countBackfillsByExecutionStatus: backfillResults.countBackfillsByExecutionStatus,
    countGaps: gapResults.countGaps,
    totalUnfilledGapDurationMs: gapResults.totalUnfilledGapDurationMs,
    totalFilledGapDurationMs: gapResults.totalFilledGapDurationMs,
  };
}
