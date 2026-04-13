/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { TERMS_SIZE, bucketsToRecord, bucketsToArray } from './constants';
import type { RuleStatsAggregations, RuleStatsResults } from './types';

export async function getRuleStats(esClient: ElasticsearchClient): Promise<RuleStatsResults> {
  const response = await esClient.search({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    size: 0,
    track_total_hits: true,
    query: {
      bool: {
        filter: [{ term: { type: RULE_SAVED_OBJECT_TYPE } }],
      },
    },
    // Runtime mappings for fields stored with enabled:false (not indexed, read from _source)
    runtime_mappings: {
      rule_recovery_policy_type: {
        type: 'keyword',
        script: {
          source: `
            def rule = params._source['${RULE_SAVED_OBJECT_TYPE}'];
            if (rule != null) {
              def rp = rule['recovery_policy'];
              if (rp != null) {
                def t = rp['type'];
                if (t != null) emit(t);
              }
            }
          `,
        },
      },
      rule_pending_count: {
        type: 'long',
        script: {
          source: `
            def rule = params._source['${RULE_SAVED_OBJECT_TYPE}'];
            if (rule != null) {
              def st = rule['state_transition'];
              if (st != null) {
                def v = st['pending_count'];
                if (v != null) emit((long) v);
              }
            }
          `,
        },
      },
      rule_recovering_count: {
        type: 'long',
        script: {
          source: `
            def rule = params._source['${RULE_SAVED_OBJECT_TYPE}'];
            if (rule != null) {
              def st = rule['state_transition'];
              if (st != null) {
                def v = st['recovering_count'];
                if (v != null) emit((long) v);
              }
            }
          `,
        },
      },
      rule_pending_timeframe: {
        type: 'keyword',
        script: {
          source: `
            def rule = params._source['${RULE_SAVED_OBJECT_TYPE}'];
            if (rule != null) {
              def st = rule['state_transition'];
              if (st != null) {
                def v = st['pending_timeframe'];
                if (v != null) emit(v);
              }
            }
          `,
        },
      },
      rule_recovering_timeframe: {
        type: 'keyword',
        script: {
          source: `
            def rule = params._source['${RULE_SAVED_OBJECT_TYPE}'];
            if (rule != null) {
              def st = rule['state_transition'];
              if (st != null) {
                def v = st['recovering_timeframe'];
                if (v != null) emit(v);
              }
            }
          `,
        },
      },
      rule_grouping_fields_count: {
        type: 'long',
        script: {
          source: `
            def rule = params._source['${RULE_SAVED_OBJECT_TYPE}'];
            if (rule != null) {
              def grouping = rule['grouping'];
              if (grouping != null) {
                def fields = grouping['fields'];
                if (fields != null) emit((long) fields.size());
              }
            }
          `,
        },
      },
      rule_no_data_behavior: {
        type: 'keyword',
        script: {
          source: `
            def rule = params._source['${RULE_SAVED_OBJECT_TYPE}'];
            if (rule != null) {
              def nd = rule['no_data'];
              if (nd != null) {
                def v = nd['behavior'];
                if (v != null) emit(v);
              }
            }
          `,
        },
      },
      rule_no_data_timeframe: {
        type: 'keyword',
        script: {
          source: `
            def rule = params._source['${RULE_SAVED_OBJECT_TYPE}'];
            if (rule != null) {
              def nd = rule['no_data'];
              if (nd != null) {
                def v = nd['timeframe'];
                if (v != null) emit(v);
              }
            }
          `,
        },
      },
    },
    aggs: {
      count_enabled: {
        filter: { term: { [`${RULE_SAVED_OBJECT_TYPE}.enabled`]: true } },
      },
      count_by_kind: {
        terms: { field: `${RULE_SAVED_OBJECT_TYPE}.kind`, size: TERMS_SIZE },
      },
      count_by_schedule: {
        terms: { field: `${RULE_SAVED_OBJECT_TYPE}.schedule.every`, size: TERMS_SIZE },
      },
      count_by_lookback: {
        terms: { field: `${RULE_SAVED_OBJECT_TYPE}.schedule.lookback`, size: TERMS_SIZE },
      },
      count_with_recovery_policy: {
        filter: { exists: { field: 'rule_recovery_policy_type' } },
      },
      count_by_recovery_policy_type: {
        terms: { field: 'rule_recovery_policy_type', size: TERMS_SIZE },
      },
      avg_pending_count: {
        avg: { field: 'rule_pending_count' },
      },
      avg_recovering_count: {
        avg: { field: 'rule_recovering_count' },
      },
      count_by_pending_timeframe: {
        terms: { field: 'rule_pending_timeframe', size: TERMS_SIZE },
      },
      count_by_recovering_timeframe: {
        terms: { field: 'rule_recovering_timeframe', size: TERMS_SIZE },
      },
      count_with_grouping: {
        filter: { exists: { field: `${RULE_SAVED_OBJECT_TYPE}.grouping.fields` } },
      },
      avg_grouping_fields_count: {
        avg: { field: 'rule_grouping_fields_count' },
      },
      count_with_no_data: {
        filter: { exists: { field: 'rule_no_data_behavior' } },
      },
      count_by_no_data_behavior: {
        terms: { field: 'rule_no_data_behavior', size: TERMS_SIZE },
      },
      count_by_no_data_timeframe: {
        terms: { field: 'rule_no_data_timeframe', size: TERMS_SIZE },
      },
      min_created_at: {
        min: { field: `${RULE_SAVED_OBJECT_TYPE}.createdAt`, format: 'strict_date_time' },
      },
    },
  });

  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;

  const aggs = response.aggregations as unknown as RuleStatsAggregations | undefined;

  return {
    count_total: total,
    count_enabled: aggs?.count_enabled.doc_count ?? 0,
    count_by_kind: bucketsToRecord<'alert' | 'signal'>(aggs?.count_by_kind.buckets),
    count_by_schedule: bucketsToArray(aggs?.count_by_schedule.buckets),
    count_by_lookback: bucketsToArray(aggs?.count_by_lookback.buckets),
    count_with_recovery_policy: aggs?.count_with_recovery_policy.doc_count ?? 0,
    count_by_recovery_policy_type: bucketsToRecord<'query' | 'no_breach'>(
      aggs?.count_by_recovery_policy_type.buckets
    ),
    avg_pending_count: aggs?.avg_pending_count.value ?? null,
    avg_recovering_count: aggs?.avg_recovering_count.value ?? null,
    count_by_pending_timeframe: bucketsToArray(aggs?.count_by_pending_timeframe.buckets),
    count_by_recovering_timeframe: bucketsToArray(aggs?.count_by_recovering_timeframe.buckets),
    count_with_grouping: aggs?.count_with_grouping.doc_count ?? 0,
    avg_grouping_fields_count: aggs?.avg_grouping_fields_count.value ?? null,
    count_with_no_data: aggs?.count_with_no_data.doc_count ?? 0,
    count_by_no_data_behavior: bucketsToRecord<'no_data' | 'last_status' | 'recover'>(
      aggs?.count_by_no_data_behavior.buckets
    ),
    count_by_no_data_timeframe: bucketsToArray(aggs?.count_by_no_data_timeframe.buckets),
    min_created_at: aggs?.min_created_at.value_as_string ?? null,
  };
}
