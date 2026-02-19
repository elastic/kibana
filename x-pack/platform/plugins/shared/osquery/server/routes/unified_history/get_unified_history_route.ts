/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';

import { PLUGIN_ID } from '../../../common';
import {
  API_VERSIONS,
  ACTIONS_INDEX,
  ACTION_RESPONSES_INDEX,
  ACTION_RESPONSES_DATA_STREAM_INDEX,
} from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { packSavedObjectType } from '../../../common/types';
import type { PackSavedObject } from '../../common/types';
import type {
  UnifiedHistoryRow,
  UnifiedHistoryResponse,
} from '../../../common/api/unified_history/types';
import { buildLiveActionsQuery } from './query_live_actions_dsl';
import { buildScheduledResponsesQuery } from './query_scheduled_responses_dsl';

interface ScheduledBucket {
  key: [string, number]; // multi_terms key: [schedule_id, schedule_execution_count]
  key_as_string: string;
  doc_count: number;
  max_timestamp: { value: number; value_as_string: string };
  agent_count: { value: number };
  total_rows: { value: number };
  success_count: { doc_count: number };
  error_count: { doc_count: number };
}

const buildPackLookup = (
  packSOs: Array<{ id: string; attributes: PackSavedObject }>
): Map<string, { packId: string; packName: string; queryName: string; queryText: string }> => {
  const lookup = new Map<string, { packId: string; packName: string; queryName: string; queryText: string }>();

  for (const packSO of packSOs) {
    const { queries, name: packName } = packSO.attributes;
    if (!queries) continue;
    for (const query of queries) {
      if (query.schedule_id) {
        lookup.set(query.schedule_id, {
          packId: packSO.id,
          packName,
          queryName: query.name ?? query.id,
          queryText: query.query,
        });
      }
    }
  }

  return lookup;
};

export const getUnifiedHistoryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/history',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-read`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: schema.object({
              pageSize: schema.number({ defaultValue: 20, min: 1, max: 100 }),
              cursor: schema.maybe(schema.string()),
              kuery: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const spaceId = osqueryContext?.service?.getActiveSpace
            ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
            : DEFAULT_SPACE_ID;

          const { pageSize, cursor, kuery } = request.query;

          // Fetch pageSize + 1 from each source to detect if more pages exist
          const fetchSize = pageSize + 1;

          // Fetch packs once — needed for both search filtering and name resolution
          const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
            osqueryContext,
            request
          );
          const packResults = await spaceScopedClient.find<PackSavedObject>({
            type: packSavedObjectType,
            perPage: 1000,
          });
          const packSOs = packResults.saved_objects as Array<{
            id: string;
            attributes: PackSavedObject;
          }>;

          // When searching, resolve matching schedule IDs from pack saved objects
          // because scheduled response documents don't contain query/pack names
          let matchingScheduleIds: string[] | undefined;
          if (kuery) {
            const searchTerm = kuery.replace(/\*/g, '').toLowerCase();
            matchingScheduleIds = [];
            for (const packSO of packSOs) {
              const pack = packSO.attributes;
              if (!pack.queries) continue;
              for (const query of pack.queries) {
                if (!query.schedule_id) continue;
                const nameMatch =
                  (query.name ?? query.id).toLowerCase().includes(searchTerm) ||
                  pack.name.toLowerCase().includes(searchTerm) ||
                  query.query.toLowerCase().includes(searchTerm);
                if (nameMatch) {
                  matchingScheduleIds.push(query.schedule_id);
                }
              }
            }
          }

          const actionsQuery = buildLiveActionsQuery({
            pageSize: fetchSize,
            cursor,
            kuery,
            spaceId,
          });

          const scheduledQuery = buildScheduledResponsesQuery({
            pageSize: fetchSize,
            cursor,
            scheduleIds: matchingScheduleIds,
          });

          const [actionsResult, scheduledResult] = await Promise.all([
            esClient.search(
              {
                index: `${ACTIONS_INDEX}*`,
                ...actionsQuery,
              },
              { ignore: [404] }
            ),
            esClient.search(
              {
                index: `${ACTION_RESPONSES_INDEX}-*,${ACTION_RESPONSES_DATA_STREAM_INDEX}-*`,
                ...scheduledQuery,
              },
              { ignore: [404] }
            ),
          ]);

          const liveRows: UnifiedHistoryRow[] = (actionsResult.hits?.hits ?? []).map(
            (hit: Record<string, unknown>) => {
              const hitFields = (hit.fields ?? {}) as Record<string, unknown>;
              const source = (hit._source ?? {}) as Record<string, unknown>;

              // hit.fields returns leaf values as arrays; _source has the nested structure.
              // Some fields (e.g. data.query) may only exist in _source, so check both.
              const getField = (name: string): unknown => {
                const val = hitFields[name];
                if (val !== undefined) {
                  return Array.isArray(val) ? val[0] : val;
                }

                // Fall back to _source — walk dotted paths (e.g. "data.query")
                const parts = name.split('.');
                let cur: unknown = source;
                for (const part of parts) {
                  if (cur == null || typeof cur !== 'object') return undefined;
                  cur = (cur as Record<string, unknown>)[part];
                }

                return Array.isArray(cur) ? cur[0] : cur;
              };

              // agents is a genuine array of agent IDs — access it directly
              const agentsRaw = hitFields.agents ?? source.agents;
              const agentsList = Array.isArray(agentsRaw) ? agentsRaw : [];

              // Query text and agents live inside _source.queries[]
              const queries = (source.queries ?? []) as Array<{
                query?: string;
                agents?: string[];
                id?: string;
              }>;
              const isPack = queries.length > 1 || getField('pack_id');
              const queryText = isPack ? '' : queries[0]?.query ?? '';

              // For packs (multiple queries), total agents from the top-level field;
              // individual query agent counts come from each sub-query's agents array
              const totalAgents =
                agentsList.length > 0
                  ? agentsList.length
                  : queries.reduce((sum, q) => sum + (q.agents?.length ?? 0), 0);

              return {
                id: getField('action_id') as string,
                rowType: 'live' as const,
                timestamp: getField('@timestamp') as string,
                queryText,
                queryName: getField('pack_name') as string | undefined,
                source: 'Live' as const,
                packName: getField('pack_name') as string | undefined,
                packId: getField('pack_id') as string | undefined,
                agentCount: totalAgents,
                successCount: 0,
                errorCount: 0,
                totalRows: 0,
                userId: getField('user_id') as string | undefined,
                actionId: getField('action_id') as string,
              };
            }
          );

          const scheduledAgg =
            (scheduledResult.aggregations as Record<string, unknown>)?.scheduled_executions ??
            undefined;
          const scheduledBuckets: ScheduledBucket[] =
            (scheduledAgg as Record<string, unknown>)?.buckets ?? [];

          const packLookup = buildPackLookup(packSOs);

          const scheduledRows: UnifiedHistoryRow[] = scheduledBuckets.map((bucket) => {
            const scheduleId = bucket.key[0];
            const executionCount = bucket.key[1];
            const packContext = packLookup.get(scheduleId);

            return {
              id: `${scheduleId}_${executionCount}`,
              rowType: 'scheduled' as const,
              timestamp: bucket.max_timestamp.value_as_string,
              queryText: packContext?.queryText ?? '',
              queryName: packContext?.queryName,
              source: 'Scheduled' as const,
              packName: packContext?.packName,
              packId: packContext?.packId,
              agentCount: bucket.agent_count.value,
              successCount: bucket.success_count.doc_count,
              errorCount: bucket.error_count.doc_count,
              totalRows: bucket.total_rows.value,
              scheduleId,
              executionCount,
            };
          });

          const allMerged = [...liveRows, ...scheduledRows].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          const hasMore = allMerged.length > pageSize;
          const merged = allMerged.slice(0, pageSize);
          const lastItem = merged[merged.length - 1];
          const nextCursor = hasMore && lastItem ? lastItem.timestamp : undefined;

          const body: UnifiedHistoryResponse = {
            rows: merged,
            nextCursor,
            hasMore,
          };

          return response.ok({ body });
        } catch (err) {
          const error = err as Error;

          return response.customError({
            statusCode: 500,
            body: { message: error.message },
          });
        }
      }
    );
};
