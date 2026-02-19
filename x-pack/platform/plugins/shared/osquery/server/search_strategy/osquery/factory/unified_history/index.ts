/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import type {
  UnifiedHistoryRequestOptions,
  UnifiedHistoryStrategyResponse,
  UnifiedHistoryRow,
  OsqueryQueries,
} from '../../../../../common/search_strategy/osquery';
import { inspectStringifyObject } from '../../../../../common/utils/build_query';
import type { OsqueryFactory } from '../types';
import { buildUnifiedHistoryActionsQuery } from './query.unified_history_actions.dsl';
import { buildUnifiedHistoryScheduledQuery } from './query.unified_history_scheduled.dsl';

interface CompositeExecutionBucket {
  key: { schedule_id: string; execution_count: number };
  doc_count: number;
  max_timestamp: { value: number | null };
  agent_count: { value: number };
  total_rows: { value: number };
  success_count: { doc_count: number };
  error_count: { doc_count: number };
}

interface ScheduledAggregations {
  executions: {
    buckets: CompositeExecutionBucket[];
    after_key?: { schedule_id: string; execution_count: number };
  };
}

export { buildUnifiedHistoryScheduledQuery };

export const unifiedHistory: OsqueryFactory<OsqueryQueries.unifiedHistory> = {
  buildDsl: (options: UnifiedHistoryRequestOptions) => buildUnifiedHistoryActionsQuery(options),

  parse: async (
    options: UnifiedHistoryRequestOptions,
    response: IEsSearchResponse,
    scheduledResponse?: IEsSearchResponse
  ): Promise<UnifiedHistoryStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildUnifiedHistoryActionsQuery(options))],
    };

    // Parse live query action hits
    const actionRows: UnifiedHistoryRow[] = (response.rawResponse.hits.hits ?? []).map(
      (hit: any) => {
        const source = hit._source ?? {};
        const fields = hit.fields ?? {};
        const queries = source.queries ?? [];
        const queryText =
          queries.length === 1 ? queries[0].query : `${queries.length} queries`;

        return {
          id: source.action_id ?? hit._id,
          rowType: 'live' as const,
          timestamp: fields['@timestamp']?.[0] ?? source['@timestamp'] ?? '',
          queryText,
          source: source.alert_ids?.length ? 'Rule' : 'Live',
          packName: source.pack_name,
          packId: source.pack_id,
          agentCount: fields.agents?.length ?? source.agents?.length ?? 0,
          successCount: 0,
          errorCount: 0,
          totalRows: 0,
          userId: fields.user_id?.[0] ?? source.user_id,
          actionId: source.action_id ?? hit._id,
          queryCount: queries.length,
        } as UnifiedHistoryRow;
      }
    );

    // Parse scheduled execution composite buckets
    // Each bucket = one full execution cycle (all queries, all agents) for a schedule_id
    const scheduledRows: UnifiedHistoryRow[] = [];
    if (scheduledResponse) {
      const aggs = scheduledResponse.rawResponse
        .aggregations as unknown as ScheduledAggregations;
      const buckets = aggs?.executions?.buckets ?? [];

      for (const bucket of buckets) {
        const scheduleId = bucket.key.schedule_id;
        const executionCount = bucket.key.execution_count;

        scheduledRows.push({
          id: `${scheduleId}:${executionCount}`,
          rowType: 'scheduled',
          timestamp: bucket.max_timestamp.value
            ? new Date(bucket.max_timestamp.value).toISOString()
            : '',
          queryText: '',
          source: 'Scheduled',
          agentCount: bucket.agent_count.value,
          successCount: bucket.success_count.doc_count,
          errorCount: bucket.error_count.doc_count,
          totalRows: bucket.total_rows.value,
          actionId: scheduleId,
          scheduleId,
          executionCount,
        });
      }
    }

    // Merge by timestamp descending, take pageSize items
    const merged = [...actionRows, ...scheduledRows].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const pageSize = options.pageSize;
    const rows = merged.slice(0, pageSize);
    const nextCursor = rows.length === pageSize ? rows[rows.length - 1].timestamp : undefined;
    const totalActions =
      (response.rawResponse.hits.total as any)?.value ??
      response.rawResponse.hits.total ??
      0;
    const total = totalActions + scheduledRows.length;

    return {
      ...response,
      inspect,
      rows,
      total,
      nextCursor,
    };
  },
};
