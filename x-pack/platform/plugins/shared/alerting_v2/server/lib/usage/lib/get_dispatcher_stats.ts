/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  DispatchFailureReason,
  GroupingMode,
  ThrottleStrategy,
} from '@kbn/alerting-v2-schemas';
import {
  ACTION_POLICY_EVENT_ACTIONS,
  ACTION_POLICY_EVENT_PROVIDER,
} from '../../dispatcher/steps/constants';
import { ACTION_POLICY_SAVED_OBJECT_TYPE, RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { TERMS_SIZE, bucketsToRecord } from './constants';
import type {
  DispatcherActionBucket,
  DispatcherEventStatsAggregations,
  DispatcherGroupingModeBucket,
  DispatcherPolicyActivityBucket,
  DispatcherPolicyStatsAggregations,
  DispatcherStatsResults,
  DispatcherStrategyBucket,
  PercentilesAggregation,
  TermsBucket,
  ValueAggregation,
} from './types';
import type { DispatcherPolicyActivity, Distribution } from '../types';

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

const SAVED_OBJECTS_PATH = 'kibana.saved_objects';

type Aggregations = Record<string, AggregationsAggregationContainer>;
const PERCENTS = [50, 99];

const cardinality = (field: string, precisionThreshold = CARDINALITY_PRECISION) => ({
  cardinality: { field: `${DISPATCHER_FIELDS}.${field}`, precision_threshold: precisionThreshold },
});

const sum = (field: string) => ({ sum: { field: `${DISPATCHER_FIELDS}.${field}` } });

const actionFilter = (action: string) => ({ term: { 'event.action': action } });

/** Sibling pipeline aggregations giving p50 / p99 / avg of a metric across the `by_policy` buckets. */
const distributionOf = (name: string, metricPath: string): Aggregations => ({
  [`${name}_percentiles`]: {
    percentiles_bucket: { buckets_path: `by_policy>${metricPath}`, percents: PERCENTS },
  },
  [`${name}_avg`]: { avg_bucket: { buckets_path: `by_policy>${metricPath}` } },
});

export async function getDispatcherStats(
  esClient: ElasticsearchClient
): Promise<DispatcherStatsResults> {
  const [eventStats, policyStats] = await Promise.all([
    searchEventStats(esClient),
    searchPolicyStats(esClient),
  ]);

  return {
    ...eventStats,
    ...policyStats,
  };
}

/** Sums per outcome, cardinalities over `dispatched` events and failures by reason. */
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
      // Only events written with `throttle_strategy` land in a bucket.
      throttled: {
        filter: { term: { 'event.action': THROTTLED } },
        aggs: {
          by_strategy: {
            terms: { field: `${DISPATCHER_FIELDS}.throttle_strategy`, size: ACTIONS_TERMS_SIZE },
            aggs: { action_groups: sum('action_group_count') },
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
    dispatcher_action_groups_throttled_count_by_strategy_24hr: sumsToRecord<
      ThrottleStrategy,
      DispatcherStrategyBucket
    >(aggs?.throttled.by_strategy.buckets ?? [], (bucket) => bucket.action_groups),
  };
}

/**
 * Per-policy activity and distributions, through the nested policy refs, plus the distinct rules on
 * `unmatched` events. Bounded to the `TERMS_SIZE` policies with most events.
 */
async function searchPolicyStats(esClient: ElasticsearchClient) {
  const policyRefs = (aggs: Aggregations): AggregationsAggregationContainer => ({
    nested: { path: SAVED_OBJECTS_PATH },
    aggs: {
      policies: {
        filter: { term: { [`${SAVED_OBJECTS_PATH}.type`]: ACTION_POLICY_SAVED_OBJECT_TYPE } },
        aggs,
      },
    },
  });
  // Pipeline aggregations such as `bucket_script` must hang from the multi-bucket `terms`, not
  // from the single-bucket `reverse_nested`, hence `bucketAggs` next to `events`.
  const byPolicy = (
    eventAggs: Aggregations,
    bucketAggs: Aggregations = {}
  ): AggregationsAggregationContainer => ({
    terms: { field: `${SAVED_OBJECTS_PATH}.id`, size: TERMS_SIZE },
    aggs: { events: { reverse_nested: {}, aggs: eventAggs }, ...bucketAggs },
  });

  const response = await esClient.search({
    index: EVENT_LOG_INDEX,
    size: 0,
    ignore_unavailable: true,
    query: { bool: { filter: dispatcherEventsFilter } },
    aggs: {
      // Every event of the policy: activity flags and throttle ratio.
      policy_refs: policyRefs({
        by_policy: byPolicy(
          {
            dispatched: {
              filter: actionFilter(DISPATCHED),
              aggs: { action_groups: sum('action_group_count') },
            },
            throttled: {
              filter: actionFilter(THROTTLED),
              aggs: { action_groups: sum('action_group_count') },
            },
            dispatch_failed: { filter: actionFilter(DISPATCH_FAILED) },
          },
          {
            throttle_ratio: {
              bucket_script: {
                buckets_path: {
                  throttled: 'events>throttled>action_groups',
                  dispatched: 'events>dispatched>action_groups',
                },
                // null skips the bucket, so policies with no groups do not count as ratio 0.
                script:
                  'params.throttled + params.dispatched > 0 ? params.throttled / (params.throttled + params.dispatched) : null',
              },
            },
          }
        ),
        ...distributionOf('throttle_ratio', 'throttle_ratio'),
      }),
      // Only `dispatched` events: what each notifying policy delivered.
      dispatched_events: {
        filter: actionFilter(DISPATCHED),
        aggs: {
          policy_refs: policyRefs({
            by_policy: byPolicy({
              action_groups: sum('action_group_count'),
              alerts: sum('alert_count'),
              workflow_executions: cardinality('workflow_execution_ids'),
            }),
            ...distributionOf('action_groups', 'events>action_groups'),
            ...distributionOf('alerts', 'events>alerts'),
            ...distributionOf('workflow_executions', 'events>workflow_executions'),
          }),
          // Same groups-per-policy distribution, one bucket per grouping mode recorded on the event.
          by_grouping_mode: {
            terms: { field: `${DISPATCHER_FIELDS}.grouping_mode`, size: ACTIONS_TERMS_SIZE },
            aggs: {
              policy_refs: policyRefs({
                by_policy: byPolicy({ action_groups: sum('action_group_count') }),
                ...distributionOf('action_groups', 'events>action_groups'),
              }),
            },
          },
        },
      },
      unmatched_events: {
        filter: actionFilter(UNMATCHED),
        aggs: {
          rule_refs: {
            nested: { path: SAVED_OBJECTS_PATH },
            aggs: {
              rules: {
                filter: { term: { [`${SAVED_OBJECTS_PATH}.type`]: RULE_SAVED_OBJECT_TYPE } },
                aggs: {
                  uncovered_rules: {
                    cardinality: {
                      field: `${SAVED_OBJECTS_PATH}.id`,
                      precision_threshold: CARDINALITY_PRECISION,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const aggs = response.aggregations as unknown as DispatcherPolicyStatsAggregations | undefined;
  const activity = aggs?.policy_refs.policies;
  const dispatched = aggs?.dispatched_events.policy_refs.policies;

  return {
    dispatcher_policies_count_by_activity_24hr: countByActivity(activity?.by_policy.buckets ?? []),
    dispatcher_action_groups_dispatched_per_policy_24hr: toDistribution(
      dispatched?.action_groups_percentiles,
      dispatched?.action_groups_avg
    ),
    dispatcher_alerts_dispatched_per_policy_24hr: toDistribution(
      dispatched?.alerts_percentiles,
      dispatched?.alerts_avg
    ),
    dispatcher_workflow_executions_per_policy_24hr: toDistribution(
      dispatched?.workflow_executions_percentiles,
      dispatched?.workflow_executions_avg
    ),
    dispatcher_throttle_ratio_per_policy_24hr: toDistribution(
      activity?.throttle_ratio_percentiles,
      activity?.throttle_ratio_avg
    ),
    dispatcher_uncovered_rules_count_24hr:
      aggs?.unmatched_events.rule_refs.rules.uncovered_rules.value ?? 0,
    dispatcher_action_groups_dispatched_per_policy_by_grouping_mode_24hr:
      distributionsByKey<GroupingMode>(aggs?.dispatched_events.by_grouping_mode.buckets ?? []),
  };
}

const distributionsByKey = <K extends string>(
  buckets: DispatcherGroupingModeBucket[]
): Partial<Record<K, Distribution>> =>
  buckets.reduce<Partial<Record<K, Distribution>>>((acc, { key, policy_refs: refs }) => {
    acc[key as K] = toDistribution(
      refs.policies.action_groups_percentiles,
      refs.policies.action_groups_avg
    );
    return acc;
  }, {});

/** Policies with at least one event of each kind; `broken` = failing with nothing dispatched. */
const countByActivity = (
  buckets: DispatcherPolicyActivityBucket[]
): Record<DispatcherPolicyActivity, number> =>
  buckets.reduce(
    (acc, { events }) => {
      const hasDispatched = events.dispatched.doc_count > 0;
      const hasFailed = events.dispatch_failed.doc_count > 0;
      if (hasDispatched) acc.dispatched += 1;
      if (events.throttled.doc_count > 0) acc.throttled += 1;
      if (hasFailed) acc.failing += 1;
      if (hasFailed && !hasDispatched) acc.broken += 1;
      return acc;
    },
    { dispatched: 0, throttled: 0, failing: 0, broken: 0 }
  );

const toDistribution = (
  percentiles: PercentilesAggregation | undefined,
  avg: ValueAggregation | undefined
): Distribution => ({
  p50: percentiles?.values['50.0'] ?? null,
  p99: percentiles?.values['99.0'] ?? null,
  avg: avg?.value ?? null,
});

/** Picks the summed value of the buckets whose key is one of `keys`; absent keys stay undefined. */
const sumsByKey = <K extends string>(
  buckets: DispatcherActionBucket[],
  keys: readonly K[],
  getSum: (bucket: DispatcherActionBucket) => ValueAggregation
): Partial<Record<K, number>> => {
  const allowed = new Set<string>(keys);
  return sumsToRecord<K, DispatcherActionBucket>(
    buckets.filter((bucket) => allowed.has(bucket.key)),
    getSum
  );
};

/** Maps every bucket to its summed value, keyed by the bucket key. */
const sumsToRecord = <K extends string, B extends TermsBucket = TermsBucket>(
  buckets: B[],
  getSum: (bucket: B) => ValueAggregation
): Partial<Record<K, number>> =>
  buckets.reduce<Partial<Record<K, number>>>((acc, bucket) => {
    acc[bucket.key as K] = getSum(bucket).value ?? 0;
    return acc;
  }, {});
