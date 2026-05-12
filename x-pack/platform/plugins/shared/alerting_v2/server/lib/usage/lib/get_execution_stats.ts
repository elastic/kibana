/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERTING_RULE_EXECUTOR_TASK_TYPE } from '../../rule_executor/constants';
import { DISPATCHER_TASK_TYPE } from '../../dispatcher/task_definition';
import { bucketsToRecord } from './constants';
import type { ExecutionStatsAggregations, ExecutionStatsResults } from './types';

const NS_PER_MS = 1000000;
export const nanosToMillis = (nanos?: number | null): number | null =>
  nanos != null ? Math.round(nanos / NS_PER_MS) : null;

const EVENT_LOG_INDEX = '.kibana-event-log-*';
const EVENT_LOG_PROVIDER = 'taskManager';
const EVENT_LOG_ACTION_TASK_RUN = 'task-run';

export async function getExecutionStats(
  esClient: ElasticsearchClient
): Promise<ExecutionStatsResults> {
  const [ruleExecutorResponse, dispatcherResponse] = await Promise.all([
    esClient.search({
      index: EVENT_LOG_INDEX,
      size: 0,
      track_total_hits: true,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { 'event.provider': EVENT_LOG_PROVIDER } },
            { term: { 'event.action': EVENT_LOG_ACTION_TASK_RUN } },
            { term: { 'kibana.task.type': ALERTING_RULE_EXECUTOR_TASK_TYPE } },
            { range: { '@timestamp': { gte: 'now-24h' } } },
          ],
        },
      },
      aggs: {
        count_by_status: {
          terms: { field: 'event.outcome', size: 10 },
        },
        delay_percentiles: {
          percentiles: {
            field: 'kibana.task.schedule_delay',
            percents: [50, 75, 95, 99],
          },
        },
      },
    }),
    esClient.count({
      index: EVENT_LOG_INDEX,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { 'event.provider': EVENT_LOG_PROVIDER } },
            { term: { 'event.action': EVENT_LOG_ACTION_TASK_RUN } },
            { term: { 'kibana.task.type': DISPATCHER_TASK_TYPE } },
            { range: { '@timestamp': { gte: 'now-24h' } } },
          ],
        },
      },
    }),
  ]);

  const total =
    typeof ruleExecutorResponse.hits.total === 'number'
      ? ruleExecutorResponse.hits.total
      : ruleExecutorResponse.hits.total?.value ?? 0;

  const aggs = ruleExecutorResponse.aggregations as unknown as
    | ExecutionStatsAggregations
    | undefined;

  const pcts = aggs?.delay_percentiles.values;

  return {
    executions_count_24hr: total,
    executions_count_by_status_24hr: bucketsToRecord<'success' | 'failure' | 'unknown'>(
      aggs?.count_by_status.buckets
    ),
    executions_delay_p50_ms: nanosToMillis(pcts?.['50.0']),
    executions_delay_p75_ms: nanosToMillis(pcts?.['75.0']),
    executions_delay_p95_ms: nanosToMillis(pcts?.['95.0']),
    executions_delay_p99_ms: nanosToMillis(pcts?.['99.0']),
    dispatcher_executions_count_24hr: dispatcherResponse.count,
  };
}
