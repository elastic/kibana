/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { NOTIFICATION_POLICY_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { TERMS_SIZE, bucketsToArray } from './constants';
import type { NotificationPolicyStatsAggregations, NotificationPolicyStatsResults } from './types';

export async function getNotificationPolicyStats(
  esClient: ElasticsearchClient
): Promise<NotificationPolicyStatsResults> {
  const response = await esClient.search({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    size: 0,
    track_total_hits: true,
    query: {
      bool: {
        filter: [{ term: { type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE } }],
      },
    },
    // Runtime mappings for fields not indexed in the notification policy mappings
    runtime_mappings: {
      np_has_matcher: {
        type: 'boolean',
        script: {
          source: `
            def np = params._source['${NOTIFICATION_POLICY_SAVED_OBJECT_TYPE}'];
            if (np != null) {
              emit(np['matcher'] != null);
            } else {
              emit(false);
            }
          `,
        },
      },
      np_throttle_interval: {
        type: 'keyword',
        script: {
          source: `
            def np = params._source['${NOTIFICATION_POLICY_SAVED_OBJECT_TYPE}'];
            if (np != null) {
              def throttle = np['throttle'];
              if (throttle != null) {
                def interval = throttle['interval'];
                if (interval != null) emit(interval);
              }
            }
          `,
        },
      },
      np_group_by_count: {
        type: 'long',
        script: {
          source: `
            def np = params._source['${NOTIFICATION_POLICY_SAVED_OBJECT_TYPE}'];
            if (np != null) {
              def groupBy = np['groupBy'];
              if (groupBy != null) emit((long) groupBy.size());
            }
          `,
        },
      },
    },
    aggs: {
      unique_workflow_count: {
        cardinality: { field: `${NOTIFICATION_POLICY_SAVED_OBJECT_TYPE}.destinations.id` },
      },
      count_with_matcher: {
        filter: { term: { np_has_matcher: true } },
      },
      count_by_throttle_interval: {
        terms: { field: 'np_throttle_interval', size: TERMS_SIZE },
      },
      count_with_group_by: {
        filter: { exists: { field: `${NOTIFICATION_POLICY_SAVED_OBJECT_TYPE}.groupBy` } },
      },
      avg_group_by_fields_count: {
        avg: { field: 'np_group_by_count' },
      },
    },
  });

  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;

  const aggs = response.aggregations as unknown as NotificationPolicyStatsAggregations | undefined;

  return {
    notification_policies_count: total,
    notification_policies_unique_workflow_count: aggs?.unique_workflow_count.value ?? 0,
    notification_policies_count_with_matcher: aggs?.count_with_matcher.doc_count ?? 0,
    notification_policies_count_with_group_by: aggs?.count_with_group_by.doc_count ?? 0,
    notification_policies_avg_group_by_fields_count: aggs?.avg_group_by_fields_count.value ?? null,
    notification_policies_count_by_throttle_interval: bucketsToArray(
      aggs?.count_by_throttle_interval.buckets
    ),
  };
}
