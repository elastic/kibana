/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DispatchFailureReason } from '@kbn/alerting-v2-schemas';
import {
  ACTION_POLICY_EVENT_ACTIONS,
  ACTION_POLICY_EVENT_PROVIDER,
} from '../../dispatcher/steps/constants';
import { bucketsToRecord } from './constants';
import type {
  DispatcherActionBucket,
  DispatcherEventStatsAggregations,
  DispatcherStatsResults,
  ValueAggregation,
} from './types';

const EVENT_LOG_INDEX = '.kibana-event-log-*';
const DISPATCHER_FIELDS = 'kibana.alerting_v2.dispatcher';
const WINDOW = 'now-24h';
const ACTIONS_TERMS_SIZE = 10;

/**
 * `cardinality` is approximate above this many distinct values.
 */
const CARDINALITY_PRECISION = 3000;
const ALERTS_CARDINALITY_PRECISION = 10000;

const { DISPATCHED, THROTTLED, UNMATCHED, DISPATCH_FAILED } = ACTION_POLICY_EVENT_ACTIONS;

const ALERTS_OUTCOMES = [DISPATCHED, THROTTLED, UNMATCHED] as const;
const ACTION_GROUPS_OUTCOMES = [DISPATCHED, THROTTLED] as const;

const dispatcherEventsFilter: QueryDslQueryContainer[] = [
  { term: { 'event.provider': ACTION_POLICY_EVENT_PROVIDER } },
  { range: { '@timestamp': { gte: WINDOW } } },
];

const cardinality = (field: string, precisionThreshold = CARDINALITY_PRECISION) => ({
  cardinality: { field: `${DISPATCHER_FIELDS}.${field}`, precision_threshold: precisionThreshold },
});

export async function getDispatcherStats(
  esClient: ElasticsearchClient
): Promise<DispatcherStatsResults> {
  const [eventStats] = await Promise.all([searchEventStats(esClient)]);

  return {
    ...eventStats,
  };
}

/** Query A: sums per outcome, cardinalities over `dispatched` events and failures by reason. */
async function searchEventStats(esClient: ElasticsearchClient) {
  const response = await esClient.search({
    index: EVENT_LOG_INDEX,
    size: 0,
    ignore_unavailable: true,
    query: { bool: { filter: dispatcherEventsFilter } },
    aggs: {
      by_action: {
        terms: { field: 'event.action', size: ACTIONS_TERMS_SIZE },
        aggs: {
          alert_count: { sum: { field: `${DISPATCHER_FIELDS}.alert_count` } },
          action_group_count: { sum: { field: `${DISPATCHER_FIELDS}.action_group_count` } },
        },
      },
      dispatched: {
        filter: { term: { 'event.action': DISPATCHED } },
        aggs: {
          unique_alerts: cardinality('alert_ids', ALERTS_CARDINALITY_PRECISION),
          workflow_executions: cardinality('workflow_execution_ids'),
          unique_workflows: cardinality('workflow_ids'),
          executions: cardinality('execution.uuid'),
          spaces: {
            cardinality: { field: 'kibana.space_ids', precision_threshold: CARDINALITY_PRECISION },
          },
        },
      },
      dispatch_failed: {
        filter: { term: { 'event.action': DISPATCH_FAILED } },
        aggs: {
          by_reason: {
            terms: { field: `${DISPATCHER_FIELDS}.failure_reason`, size: ACTIONS_TERMS_SIZE },
          },
        },
      },
    },
  });

  const aggs = response.aggregations as unknown as DispatcherEventStatsAggregations | undefined;
  const byAction = aggs?.by_action.buckets ?? [];
  const dispatched = aggs?.dispatched;

  return {
    dispatcher_alerts_count_by_outcome_24hr: sumsByKey(
      byAction,
      ALERTS_OUTCOMES,
      (bucket) => bucket.alert_count
    ),
    dispatcher_action_groups_count_by_outcome_24hr: sumsByKey(
      byAction,
      ACTION_GROUPS_OUTCOMES,
      (bucket) => bucket.action_group_count
    ),
    dispatcher_unique_alerts_dispatched_count_24hr: dispatched?.unique_alerts.value ?? 0,
    dispatcher_workflow_executions_count_24hr: dispatched?.workflow_executions.value ?? 0,
    dispatcher_unique_workflows_triggered_count_24hr: dispatched?.unique_workflows.value ?? 0,
    dispatcher_notifying_executions_count_24hr: dispatched?.executions.value ?? 0,
    dispatcher_notifying_spaces_count_24hr: dispatched?.spaces.value ?? 0,
    dispatcher_dispatch_failures_count_by_reason_24hr: bucketsToRecord<DispatchFailureReason>(
      aggs?.dispatch_failed.by_reason.buckets
    ),
  };
}

/** Picks the summed value of the buckets whose key is one of `keys`; absent keys stay undefined. */
const sumsByKey = <K extends string>(
  buckets: DispatcherActionBucket[],
  keys: readonly K[],
  getSum: (bucket: DispatcherActionBucket) => ValueAggregation
): Partial<Record<K, number>> => {
  const allowed = new Set<string>(keys);
  return buckets.reduce<Partial<Record<K, number>>>((acc, bucket) => {
    if (allowed.has(bucket.key)) {
      acc[bucket.key as K] = getSum(bucket).value ?? 0;
    }
    return acc;
  }, {});
};
