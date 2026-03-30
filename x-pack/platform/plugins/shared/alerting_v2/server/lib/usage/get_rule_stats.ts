/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { RULE_SAVED_OBJECT_TYPE, NOTIFICATION_POLICY_SAVED_OBJECT_TYPE } from '../../saved_objects';

const TERMS_SIZE = 100;

interface TermsBucket {
  key: string;
  doc_count: number;
}

interface RuleStatsAggregations {
  count_enabled: { doc_count: number };
  count_by_kind: { buckets: TermsBucket[] };
  count_by_schedule: { buckets: TermsBucket[] };
  count_by_lookback: { buckets: TermsBucket[] };
  count_with_query_condition: { doc_count: number };
  count_with_recovery_policy: { doc_count: number };
  count_by_recovery_policy_type: { buckets: TermsBucket[] };
  count_with_recovery_query_condition: { doc_count: number };
  count_by_pending_timeframe: { buckets: TermsBucket[] };
  count_by_recovering_timeframe: { buckets: TermsBucket[] };
  count_with_grouping: { doc_count: number };
  avg_grouping_fields_count: { value: number | null };
  count_with_no_data: { doc_count: number };
  count_by_no_data_behavior: { buckets: TermsBucket[] };
  count_by_no_data_timeframe: { buckets: TermsBucket[] };
  min_created_at: { value: number | null; value_as_string?: string };
}

function bucketsToRecord(buckets: TermsBucket[]): Record<string, number> {
  return buckets.reduce<Record<string, number>>((acc, { key, doc_count: count }) => {
    acc[key] = count;
    return acc;
  }, {});
}

export interface RuleStats {
  count_total: number;
  count_enabled: number;
  count_by_kind: Record<string, number>;
  count_by_schedule: Record<string, number>;
  count_by_lookback: Record<string, number>;
  count_with_query_condition: number;
  count_with_recovery_policy: number;
  count_by_recovery_policy_type: Record<string, number>;
  count_with_recovery_query_condition: number;
  count_by_pending_timeframe: Record<string, number>;
  count_by_recovering_timeframe: Record<string, number>;
  count_with_grouping: number;
  avg_grouping_fields_count: number | null;
  count_with_no_data: number;
  count_by_no_data_behavior: Record<string, number>;
  count_by_no_data_timeframe: Record<string, number>;
  count_notification_policies: number;
  min_created_at: string | null;
}

export async function getRuleStats(
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<RuleStats> {
  const [ruleStats, notificationPolicyCount] = await Promise.all([
    fetchRuleAggregations(esClient, logger),
    fetchNotificationPolicyCount(esClient, logger),
  ]);

  return { ...ruleStats, count_notification_policies: notificationPolicyCount };
}

async function fetchRuleAggregations(
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<Omit<RuleStats, 'count_notification_policies'>> {
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
      rule_has_recovery_query_condition: {
        type: 'boolean',
        script: {
          source: `
            def rule = params._source['${RULE_SAVED_OBJECT_TYPE}'];
            if (rule != null) {
              def rp = rule['recovery_policy'];
              if (rp != null) {
                def q = rp['query'];
                if (q != null && q['condition'] != null) {
                  emit(true);
                  return;
                }
              }
            }
            emit(false);
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
      count_with_query_condition: {
        filter: {
          exists: { field: `${RULE_SAVED_OBJECT_TYPE}.evaluation.query.condition` },
        },
      },
      // recovery_policy: use runtime field (enabled:false in mappings)
      count_with_recovery_policy: {
        filter: { exists: { field: 'rule_recovery_policy_type' } },
      },
      count_by_recovery_policy_type: {
        terms: { field: 'rule_recovery_policy_type', size: TERMS_SIZE },
      },
      count_with_recovery_query_condition: {
        filter: { term: { rule_has_recovery_query_condition: true } },
      },
      // state_transition: use runtime fields (enabled:false in mappings)
      count_by_pending_timeframe: {
        terms: { field: 'rule_pending_timeframe', size: TERMS_SIZE },
      },
      count_by_recovering_timeframe: {
        terms: { field: 'rule_recovering_timeframe', size: TERMS_SIZE },
      },
      // grouping: fields is indexed, but array length requires runtime field
      count_with_grouping: {
        filter: { exists: { field: `${RULE_SAVED_OBJECT_TYPE}.grouping.fields` } },
      },
      avg_grouping_fields_count: {
        avg: { field: 'rule_grouping_fields_count' },
      },
      // no_data: use runtime fields (enabled:false in mappings)
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

  const aggs = response.aggregations as unknown as RuleStatsAggregations;

  return {
    count_total: total,
    count_enabled: aggs.count_enabled.doc_count,
    count_by_kind: bucketsToRecord(aggs.count_by_kind.buckets),
    count_by_schedule: bucketsToRecord(aggs.count_by_schedule.buckets),
    count_by_lookback: bucketsToRecord(aggs.count_by_lookback.buckets),
    count_with_query_condition: aggs.count_with_query_condition.doc_count,
    count_with_recovery_policy: aggs.count_with_recovery_policy.doc_count,
    count_by_recovery_policy_type: bucketsToRecord(aggs.count_by_recovery_policy_type.buckets),
    count_with_recovery_query_condition: aggs.count_with_recovery_query_condition.doc_count,
    count_by_pending_timeframe: bucketsToRecord(aggs.count_by_pending_timeframe.buckets),
    count_by_recovering_timeframe: bucketsToRecord(aggs.count_by_recovering_timeframe.buckets),
    count_with_grouping: aggs.count_with_grouping.doc_count,
    avg_grouping_fields_count: aggs.avg_grouping_fields_count.value,
    count_with_no_data: aggs.count_with_no_data.doc_count,
    count_by_no_data_behavior: bucketsToRecord(aggs.count_by_no_data_behavior.buckets),
    count_by_no_data_timeframe: bucketsToRecord(aggs.count_by_no_data_timeframe.buckets),
    min_created_at: aggs.min_created_at.value_as_string ?? null,
  };
}

async function fetchNotificationPolicyCount(
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<number> {
  const response = await esClient.count({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    query: {
      bool: {
        filter: [{ term: { type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE } }],
      },
    },
  });

  return response.count;
}
