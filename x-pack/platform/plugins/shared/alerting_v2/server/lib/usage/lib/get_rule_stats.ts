/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { NoDataStrategy, RecoveryStrategy } from '@kbn/alerting-v2-schemas';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { AGENT_BUILDER_TAG } from '../../../agent_builder/common/constants';
import { TERMS_SIZE, bucketsToRecord, bucketsToArray } from './constants';
import type { RuleStatsAggregations, RuleStatsResults } from './types';

/**
 * A runtime field over an attribute that is stored with `enabled: false` and so
 * has to be read from `_source`. Walks `path` and emits the leaf only when
 * every level along the way is present.
 */
const runtimeField = (
  type: 'long' | 'keyword' | 'date',
  path: readonly string[],
  emit: (value: string) => string
) => ({
  type,
  script: {
    source: `
      def node = params._source['${RULE_SAVED_OBJECT_TYPE}'];
      ${path.map((key) => `if (node == null) return; node = node['${key}'];`).join('\n      ')}
      if (node != null) ${emit('node')};
    `,
  },
});

const emitLong = (path: readonly string[]) =>
  runtimeField('long', path, (value) => `emit((long) ${value})`);
const emitKeyword = (path: readonly string[]) => runtimeField('keyword', path, (v) => `emit(${v})`);
const emitDate = (path: readonly string[]) =>
  runtimeField('date', path, (value) => `emit(Instant.parse(${value}).toEpochMilli())`);

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
      rule_pending_count: emitLong(['state_transition', 'pending', 'count']),
      rule_recovering_count: emitLong(['state_transition', 'recovering', 'count']),
      rule_pending_timeframe: emitKeyword(['state_transition', 'pending', 'timeframe']),
      rule_recovering_timeframe: emitKeyword(['state_transition', 'recovering', 'timeframe']),
      rule_grouping_fields_count: runtimeField(
        'long',
        ['grouping', 'fields'],
        (v) => `emit((long) ${v}.size())`
      ),
      rule_schedule_every: emitKeyword(['schedule', 'every']),
      rule_schedule_lookback: emitKeyword(['schedule', 'lookback']),
      rule_created_at: emitDate(['createdAt']),
      rule_updated_at: emitDate(['updatedAt']),
      rule_recovery_strategy: emitKeyword(['recovery', 'strategy']),
      rule_no_data_strategy: emitKeyword(['no_data', 'strategy']),
    },
    aggs: {
      count_enabled: {
        filter: { term: { [`${RULE_SAVED_OBJECT_TYPE}.enabled`]: true } },
      },
      count_agent_builder_assisted: {
        filter: { term: { [`${RULE_SAVED_OBJECT_TYPE}.metadata.tags`]: AGENT_BUILDER_TAG } },
      },
      count_by_kind: {
        terms: { field: `${RULE_SAVED_OBJECT_TYPE}.kind`, size: TERMS_SIZE },
      },
      count_by_schedule: {
        terms: { field: 'rule_schedule_every', size: TERMS_SIZE },
      },
      count_by_lookback: {
        terms: { field: 'rule_schedule_lookback', size: TERMS_SIZE },
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
        filter: { exists: { field: 'rule_grouping_fields_count' } },
      },
      avg_grouping_fields_count: {
        avg: { field: 'rule_grouping_fields_count' },
      },
      min_created_at: {
        min: { field: 'rule_created_at', format: 'strict_date_time' },
      },
      count_by_recovery_strategy: {
        terms: { field: 'rule_recovery_strategy', size: TERMS_SIZE },
      },
      count_by_no_data_strategy: {
        terms: { field: 'rule_no_data_strategy', size: TERMS_SIZE },
      },
    },
  });

  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;

  const aggs = response.aggregations as unknown as RuleStatsAggregations | undefined;

  return {
    count_total: total,
    count_enabled: aggs?.count_enabled.doc_count ?? 0,
    count_agent_builder_assisted: aggs?.count_agent_builder_assisted.doc_count ?? 0,
    count_by_kind: bucketsToRecord<'alert' | 'signal'>(aggs?.count_by_kind.buckets),
    count_by_schedule: bucketsToArray(aggs?.count_by_schedule.buckets),
    count_by_lookback: bucketsToArray(aggs?.count_by_lookback.buckets),
    avg_pending_count: aggs?.avg_pending_count.value ?? null,
    avg_recovering_count: aggs?.avg_recovering_count.value ?? null,
    count_by_pending_timeframe: bucketsToArray(aggs?.count_by_pending_timeframe.buckets),
    count_by_recovering_timeframe: bucketsToArray(aggs?.count_by_recovering_timeframe.buckets),
    count_with_grouping: aggs?.count_with_grouping.doc_count ?? 0,
    avg_grouping_fields_count: aggs?.avg_grouping_fields_count.value ?? null,
    min_created_at: aggs?.min_created_at.value_as_string ?? null,
    count_by_recovery_strategy: bucketsToRecord<RecoveryStrategy>(
      aggs?.count_by_recovery_strategy?.buckets
    ),
    count_by_no_data_strategy: bucketsToRecord<NoDataStrategy>(
      aggs?.count_by_no_data_strategy?.buckets
    ),
  };
}
