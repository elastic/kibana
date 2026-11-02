/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { GroupingMode, ThrottleStrategy } from '@kbn/alerting-v2-schemas';
import { ACTION_POLICY_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { TERMS_SIZE, bucketsToArray, bucketsToRecord } from './constants';
import type { ActionPolicyStatsAggregations, ActionPolicyStatsResults } from './types';
import type { ActionPolicyStatus } from '../types';

export async function getActionPolicyStats(
  esClient: ElasticsearchClient,
  now: Date = new Date()
): Promise<ActionPolicyStatsResults> {
  const nowMs = now.getTime();
  const response = await esClient.search({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    size: 0,
    track_total_hits: true,
    query: {
      bool: {
        filter: [{ term: { type: ACTION_POLICY_SAVED_OBJECT_TYPE } }],
      },
    },
    // Runtime mappings for fields not indexed in the action policy mappings
    runtime_mappings: {
      ap_has_matcher: {
        type: 'boolean',
        script: {
          source: `
            def ap = params._source['${ACTION_POLICY_SAVED_OBJECT_TYPE}'];
            if (ap != null) {
              emit(ap['matcher'] != null);
            } else {
              emit(false);
            }
          `,
        },
      },
      ap_throttle_interval: {
        type: 'keyword',
        script: {
          source: `
            def ap = params._source['${ACTION_POLICY_SAVED_OBJECT_TYPE}'];
            if (ap != null) {
              def throttle = ap['throttle'];
              if (throttle != null) {
                def interval = throttle['interval'];
                if (interval != null) emit(interval);
              }
            }
          `,
        },
      },
      ap_group_by_count: {
        type: 'long',
        script: {
          source: `
            def ap = params._source['${ACTION_POLICY_SAVED_OBJECT_TYPE}'];
            if (ap != null) {
              def grouping = ap['grouping'];
              if (grouping != null) {
                def fields = grouping['fields'];
                if (fields != null) emit((long) fields.size());
              }
            }
          `,
        },
      },
      ap_destination_id: {
        type: 'keyword',
        script: {
          source: `
            def ap = params._source['${ACTION_POLICY_SAVED_OBJECT_TYPE}'];
            if (ap != null) {
              def destinations = ap['destinations'];
              if (destinations != null) {
                for (dest in destinations) {
                  if (dest != null && dest['id'] != null) {
                    emit(dest['id']);
                  }
                }
              }
            }
          `,
        },
      },
      // `disabled` = !enabled; `snoozed` = enabled and snoozedUntil > now; `enabled` otherwise.
      // An unparseable snoozedUntil counts as `enabled`: a script exception would fail the whole
      // query and drop every action policy stat, not just this one.
      ap_status: {
        type: 'keyword',
        script: {
          params: { now: nowMs },
          source: `
            def ap = params._source['${ACTION_POLICY_SAVED_OBJECT_TYPE}'];
            if (ap == null) return;
            if (ap['enabled'] != true) {
              emit('disabled');
              return;
            }
            def snoozedUntil = ap['snoozedUntil'];
            if (snoozedUntil != null) {
              try {
                long snoozedUntilMs = ZonedDateTime.parse(snoozedUntil).toInstant().toEpochMilli();
                if (snoozedUntilMs > params.now) {
                  emit('snoozed');
                  return;
                }
              } catch (Exception e) {
                // fall through to 'enabled'
              }
            }
            emit('enabled');
          `,
        },
      },
      // Absent grouping means the default, `per_alert`.
      ap_grouping_mode: {
        type: 'keyword',
        script: {
          source: `
            def ap = params._source['${ACTION_POLICY_SAVED_OBJECT_TYPE}'];
            if (ap == null) return;
            def grouping = ap['grouping'];
            if (grouping != null && grouping['mode'] != null) {
              emit(grouping['mode']);
            } else {
              emit('per_alert');
            }
          `,
        },
      },
      // `none` when the policy sets no throttle, or a throttle block without a strategy
      // (which the API reads as no throttle).
      ap_throttle_strategy: {
        type: 'keyword',
        script: {
          source: `
            def ap = params._source['${ACTION_POLICY_SAVED_OBJECT_TYPE}'];
            if (ap == null) return;
            def throttle = ap['throttle'];
            if (throttle != null && throttle['strategy'] != null) {
              emit(throttle['strategy']);
            } else {
              emit('none');
            }
          `,
        },
      },
      ap_destinations_count: {
        type: 'long',
        script: {
          source: `
            def ap = params._source['${ACTION_POLICY_SAVED_OBJECT_TYPE}'];
            if (ap == null) return;
            def destinations = ap['destinations'];
            emit(destinations == null ? 0L : (long) destinations.size());
          `,
        },
      },
    },
    aggs: {
      unique_workflow_count: {
        cardinality: { field: 'ap_destination_id' },
      },
      count_with_matcher: {
        filter: { term: { ap_has_matcher: true } },
      },
      count_by_throttle_interval: {
        terms: { field: 'ap_throttle_interval', size: TERMS_SIZE },
      },
      count_with_group_by: {
        filter: { range: { ap_group_by_count: { gt: 0 } } },
      },
      avg_group_by_fields_count: {
        avg: { field: 'ap_group_by_count' },
      },
      count_by_status: {
        terms: { field: 'ap_status', size: TERMS_SIZE },
      },
      count_by_grouping_mode: {
        terms: { field: 'ap_grouping_mode', size: TERMS_SIZE },
      },
      count_by_throttle_strategy: {
        terms: { field: 'ap_throttle_strategy', size: TERMS_SIZE },
      },
      workflows_per_policy_percentiles: {
        percentiles: { field: 'ap_destinations_count', percents: [50, 99] },
      },
      workflows_per_policy_avg: {
        avg: { field: 'ap_destinations_count' },
      },
      count_with_multiple_workflows: {
        filter: { range: { ap_destinations_count: { gt: 1 } } },
      },
    },
  });

  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;

  const aggs = response.aggregations as unknown as ActionPolicyStatsAggregations | undefined;
  const workflowsPerPolicy = aggs?.workflows_per_policy_percentiles.values;

  return {
    action_policies_count: total,
    action_policies_unique_workflow_count: aggs?.unique_workflow_count.value ?? 0,
    action_policies_count_with_matcher: aggs?.count_with_matcher.doc_count ?? 0,
    action_policies_count_with_group_by: aggs?.count_with_group_by.doc_count ?? 0,
    action_policies_avg_group_by_fields_count: aggs?.avg_group_by_fields_count.value ?? null,
    action_policies_count_by_throttle_interval: bucketsToArray(
      aggs?.count_by_throttle_interval.buckets
    ),
    action_policies_count_by_status: bucketsToRecord<ActionPolicyStatus>(
      aggs?.count_by_status.buckets
    ),
    action_policies_count_by_grouping_mode: bucketsToRecord<GroupingMode>(
      aggs?.count_by_grouping_mode.buckets
    ),
    action_policies_count_by_throttle_strategy: bucketsToRecord<ThrottleStrategy | 'none'>(
      aggs?.count_by_throttle_strategy.buckets
    ),
    action_policies_workflows_per_policy: {
      p50: workflowsPerPolicy?.['50.0'] ?? null,
      p99: workflowsPerPolicy?.['99.0'] ?? null,
      avg: aggs?.workflows_per_policy_avg.value ?? null,
    },
    action_policies_count_with_multiple_workflows:
      aggs?.count_with_multiple_workflows.doc_count ?? 0,
  };
}
