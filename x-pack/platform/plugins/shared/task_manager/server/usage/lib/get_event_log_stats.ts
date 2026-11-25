/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { EVENT_LOG_ACTIONS, EVENT_LOG_PROVIDER } from '../../constants';
import { EVENT_LOG_INDEX, MAX_TASK_TYPE_BUCKETS, TELEMETRY_WINDOW } from '../constants';
import type { EventLogStatsAggregations, EventLogStatsResults, TermsBucket } from './types';

const NS_PER_MS = 1000000;

export const nanosToMillis = (nanos?: number | null): number | null =>
  nanos != null ? Math.round(nanos / NS_PER_MS) : null;

const bucketsToArray = (buckets: TermsBucket[] = []) =>
  buckets.map(({ key: name, doc_count: value }) => ({ name, value }));

/**
 * Aggregates cluster-wide task execution volume and schedule delay from the event log.
 *
 * `task-run-start` is used rather than `task-run` because it is emitted once per execution even
 * when the task never completes (crash, cancellation), which makes it the truer measure of how
 * many task runs were actually started.
 */
export async function getEventLogStats(
  esClient: ElasticsearchClient,
  signal: AbortSignal
): Promise<EventLogStatsResults> {
  const response = await esClient.search(
    {
      index: EVENT_LOG_INDEX,
      size: 0,
      track_total_hits: true,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { 'event.provider': EVENT_LOG_PROVIDER } },
            { term: { 'event.action': EVENT_LOG_ACTIONS.taskRunStart } },
            { range: { '@timestamp': { gte: TELEMETRY_WINDOW } } },
          ],
        },
      },
      aggs: {
        by_task_type: {
          terms: { field: 'kibana.task.type', size: MAX_TASK_TYPE_BUCKETS },
        },
        delay_percentiles: {
          percentiles: {
            field: 'kibana.task.schedule_delay',
            percents: [50, 75, 95, 99],
          },
        },
      },
    },
    { signal }
  );

  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;

  const aggregations = response.aggregations as EventLogStatsAggregations | undefined;
  const percentiles = aggregations?.delay_percentiles.values;

  return {
    total_task_runs_24hr: total,
    task_runs_by_type_24hr: bucketsToArray(aggregations?.by_task_type.buckets),
    // Kibana registers far more task types than MAX_TASK_TYPE_BUCKETS, so the breakdown can be
    // truncated. Reporting the remainder keeps it reconcilable against total_task_runs_24hr.
    task_runs_other_24hr: aggregations?.by_task_type.sum_other_doc_count ?? 0,
    schedule_delay_ms_24hr: {
      p50: nanosToMillis(percentiles?.['50.0']),
      p75: nanosToMillis(percentiles?.['75.0']),
      p95: nanosToMillis(percentiles?.['95.0']),
      p99: nanosToMillis(percentiles?.['99.0']),
    },
  };
}
