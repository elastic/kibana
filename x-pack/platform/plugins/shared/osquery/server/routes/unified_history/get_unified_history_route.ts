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
  ACTION_RESPONSES_DATA_STREAM_INDEX,
} from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { packSavedObjectType } from '../../../common/types';
import type { PackSavedObject } from '../../common/types';
import type {
  UnifiedHistoryRow,
  UnifiedHistoryResponse,
  SourceFilter,
} from '../../../common/api/unified_history/types';
import { buildLiveActionsQuery } from './query_live_actions_dsl';
import { buildScheduledResponsesQuery } from './query_scheduled_responses_dsl';
import { mergeRows } from './merge_rows';
import { buildPackLookup } from './pack_lookup';
import { mapLiveHitToRow } from './map_live_hit_to_row';
import type { LiveActionHit } from './map_live_hit_to_row';
import { getResultCountsForActions } from '../../lib/get_result_counts_for_actions';

/** Shape of an aggregation bucket returned by the scheduled responses query. */
export interface ScheduledExecutionBucket {
  key: [string, number]; // multi_terms key: [schedule_id, schedule_execution_count]
  key_as_string: string;
  doc_count: number;
  max_timestamp: { value: number; value_as_string: string };
  agent_count: { value: number };
  total_rows: { value: number };
  success_count: { doc_count: number };
  error_count: { doc_count: number };
}

/** Shape of the aggregations object from the scheduled responses ES query. */
interface ScheduledAggregations {
  scheduled_executions?: {
    buckets: ScheduledExecutionBucket[];
  };
}

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
              actionsCursor: schema.maybe(schema.string()),
              scheduledCursor: schema.maybe(schema.string()),
              kuery: schema.maybe(schema.string()),
              userIds: schema.maybe(schema.string()), // comma-separated user IDs
              sourceFilters: schema.maybe(schema.string()), // comma-separated: live,rule,scheduled
              scheduledOffset: schema.number({ defaultValue: 0, min: 0 }),
              startDate: schema.maybe(schema.string()),
              endDate: schema.maybe(schema.string()),
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

          const {
            pageSize,
            cursor,
            actionsCursor,
            scheduledCursor,
            scheduledOffset,
            kuery,
            userIds: userIdsRaw,
            sourceFilters: sourceFiltersRaw,
            startDate,
            endDate,
          } = request.query;

          const userIds = userIdsRaw ? userIdsRaw.split(',').filter(Boolean) : undefined;

          // Parse source filters — when undefined, all sources are included
          const activeFilters: Set<SourceFilter> | undefined = sourceFiltersRaw
            ? new Set(sourceFiltersRaw.split(',').filter(Boolean) as SourceFilter[])
            : undefined;

          const includeLive =
            !activeFilters || activeFilters.has('live') || activeFilters.has('rule');
          const includeScheduled = !activeFilters || activeFilters.has('scheduled');

          // Support both the legacy single cursor and new dual cursors
          const effectiveActionsCursor = actionsCursor ?? cursor;
          const effectiveScheduledCursor = scheduledCursor ?? cursor;

          // Fetch pageSize + 1 from each source to detect if more pages exist
          const fetchSize = pageSize + 1;

          // Fetch packs — use cache when available, fetch and cache on miss
          const packCache = osqueryContext.service.getPackLookupCache();
          let packSOs = packCache.get(spaceId);
          if (!packSOs) {
            const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
              osqueryContext,
              request
            );
            const perPage = 1000;
            const firstPage = await spaceScopedClient.find<PackSavedObject>({
              type: packSavedObjectType,
              perPage,
            });
            packSOs = firstPage.saved_objects as Array<{
              id: string;
              attributes: PackSavedObject;
            }>;
            // Paginate if more packs exist beyond the first page
            const totalPages = Math.ceil(firstPage.total / perPage);
            for (let page = 2; page <= totalPages; page++) {
              const nextPage = await spaceScopedClient.find<PackSavedObject>({
                type: packSavedObjectType,
                perPage,
                page,
              });
              packSOs = packSOs.concat(
                nextPage.saved_objects as Array<{
                  id: string;
                  attributes: PackSavedObject;
                }>
              );
            }

            packCache.set(spaceId, packSOs);
          }

          // When searching by name, narrow to schedule IDs matching the search term.
          // Without kuery, no schedule ID filter is applied — space isolation is
          // handled natively by space_id on response documents.
          let scheduleIdsForQuery: string[] | undefined;
          if (kuery) {
            const searchTerm = kuery.trim().toLowerCase();
            scheduleIdsForQuery = [];
            for (const packSO of packSOs) {
              const pack = packSO.attributes;
              if (!pack.queries) continue;
              for (const query of pack.queries) {
                const nameMatch =
                  (query.name ?? query.id).toLowerCase().includes(searchTerm) ||
                  pack.name.toLowerCase().includes(searchTerm) ||
                  query.query.toLowerCase().includes(searchTerm);
                if (nameMatch) {
                  if (query.schedule_id) {
                    scheduleIdsForQuery.push(query.schedule_id);
                  }

                  scheduleIdsForQuery.push(`pack_${pack.name}_${query.id}`);
                }
              }
            }
          }

          const actionsQuery = includeLive
            ? buildLiveActionsQuery({
                pageSize: fetchSize,
                cursor: effectiveActionsCursor,
                kuery,
                userIds,
                spaceId,
                startDate,
                endDate,
              })
            : undefined;

          const scheduledQuery = includeScheduled
            ? buildScheduledResponsesQuery({
                pageSize: fetchSize,
                cursor: effectiveScheduledCursor,
                scheduleIds: scheduleIdsForQuery,
                spaceId,
                startDate,
                endDate,
              })
            : undefined;

          const [actionsResult, scheduledResult] = await Promise.all([
            actionsQuery
              ? esClient.search(
                  {
                    index: `${ACTIONS_INDEX}*`,
                    ...actionsQuery,
                  },
                  { ignore: [404] }
                )
              : Promise.resolve({ hits: { hits: [] } }),
            scheduledQuery
              ? esClient.search(
                  {
                    index: `${ACTION_RESPONSES_DATA_STREAM_INDEX}-*`,
                    ...scheduledQuery,
                  },
                  { ignore: [404] }
                )
              : Promise.resolve({ aggregations: {} as ScheduledAggregations }),
          ]);

          const liveHits = (actionsResult.hits?.hits ?? []) as LiveActionHit[];
          let liveRows: UnifiedHistoryRow[] = liveHits.map(mapLiveHitToRow);

          // Enrich live rows with result counts (agent success/error, total rows, pack query counts)
          if (liveHits.length > 0) {
            try {
              const allSubActionIds: string[] = [];
              const hitQueriesMap = new Map<string, Array<{ actionId: string }>>();

              for (const hit of liveHits) {
                const source = (hit._source ?? {}) as Record<string, unknown>;
                const queries = (source.queries ?? []) as Array<{
                  action_id?: string;
                }>;
                const actionId = (source.action_id as string) ?? '';
                const subQueries: Array<{ actionId: string }> = [];

                for (const q of queries) {
                  if (q.action_id) {
                    allSubActionIds.push(q.action_id);
                    subQueries.push({ actionId: q.action_id });
                  }
                }

                hitQueriesMap.set(actionId, subQueries);
              }

              const resultCountsMap = await getResultCountsForActions(
                esClient,
                allSubActionIds,
                spaceId
              );

              liveRows = liveRows.map((row) => {
                const subQueries = hitQueriesMap.get(row.actionId ?? '') ?? [];
                if (subQueries.length === 0) return row;

                if (row.packId && subQueries.length > 1) {
                  let totalRows = 0;
                  let queriesWithResults = 0;
                  let successfulAgents = 0;
                  let errorAgents = 0;
                  let maxRespondedAgents = 0;

                  for (const sq of subQueries) {
                    const counts = resultCountsMap.get(sq.actionId);
                    if (counts) {
                      totalRows += counts.totalRows;
                      if (counts.totalRows > 0) {
                        queriesWithResults++;
                      }

                      if (counts.respondedAgents > maxRespondedAgents) {
                        maxRespondedAgents = counts.respondedAgents;
                        successfulAgents = counts.successfulAgents;
                        errorAgents = counts.errorAgents;
                      }
                    }
                  }

                  return {
                    ...row,
                    totalRows,
                    successCount: successfulAgents,
                    errorCount: errorAgents,
                    queriesWithResults,
                    queriesTotal: subQueries.length,
                  };
                }

                const counts = resultCountsMap.get(subQueries[0].actionId);

                return {
                  ...row,
                  totalRows: counts?.totalRows ?? 0,
                  successCount: counts?.successfulAgents ?? 0,
                  errorCount: counts?.errorAgents ?? 0,
                };
              });
            } catch {
              // Result counts are supplementary — don't fail the listing if aggregation errors
            }
          }

          // Post-filter live rows by source type when specific filters are active
          const filteredLiveRows = activeFilters
            ? liveRows.filter((row) => {
                if (row.source === 'Rule') return activeFilters.has('rule');

                return activeFilters.has('live');
              })
            : liveRows;

          const scheduledAgg = (scheduledResult.aggregations as ScheduledAggregations)
            ?.scheduled_executions;
          const scheduledBuckets: ScheduledExecutionBucket[] = scheduledAgg?.buckets ?? [];

          const packLookup = buildPackLookup(packSOs);

          // Map all buckets to rows, then apply the offset to skip already-consumed ones.
          // The offset-based approach avoids the timestamp-collision gap: when many
          // executions share the same timestamp, `lte:` re-includes them and the offset
          // skips the ones already shown on previous pages.
          const allScheduledRows: UnifiedHistoryRow[] = scheduledBuckets.map((bucket) => {
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

          const mergeResult = mergeRows(
            filteredLiveRows,
            allScheduledRows,
            pageSize,
            scheduledOffset
          );

          // Unified cursor for backward compat
          const lastItem = mergeResult.rows[mergeResult.rows.length - 1];
          const nextCursor = mergeResult.hasMore && lastItem ? lastItem.timestamp : undefined;

          const body: UnifiedHistoryResponse = {
            rows: mergeResult.rows,
            nextCursor,
            nextActionsCursor: mergeResult.nextActionsCursor,
            nextScheduledCursor: mergeResult.nextScheduledCursor,
            nextScheduledOffset: mergeResult.nextScheduledOffset,
            hasMore: mergeResult.hasMore,
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
