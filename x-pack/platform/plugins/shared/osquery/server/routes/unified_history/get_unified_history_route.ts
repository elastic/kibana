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
  LiveHistoryRow,
  ScheduledHistoryRow,
  UnifiedHistoryResponse,
  SourceFilter,
  DecodedCursor,
} from '../../../common/api/unified_history/types';
import { buildLiveActionsQuery } from './query_live_actions_dsl';
import type { SortValues } from './query_live_actions_dsl';
import { buildScheduledResponsesQuery } from './query_scheduled_responses_dsl';
import { mergeRows } from './merge_rows';
import { buildPackLookup } from './pack_lookup';
import { mapLiveHitToRow } from './map_live_hit_to_row';
import type { LiveActionHit } from './map_live_hit_to_row';

export interface ScheduledExecutionBucket {
  key: [string, number];
  key_as_string: string;
  doc_count: number;
  planned_time: { value: number | null; value_as_string?: string };
  max_timestamp: { value: number; value_as_string: string };
  agent_count: { value: number };
  total_rows: { value: number };
  success_count: { doc_count: number };
  error_count: { doc_count: number };
  pack_id_hit?: {
    hits: {
      hits: Array<{ _source?: { pack_id?: string } }>;
    };
  };
}

interface ScheduledAggregations {
  scheduled_executions?: {
    buckets: ScheduledExecutionBucket[];
  };
}

const decodeCursor = (nextPage?: string): DecodedCursor => {
  if (!nextPage) return {};
  try {
    return JSON.parse(Buffer.from(nextPage, 'base64').toString('utf8'));
  } catch {
    return {};
  }
};

const encodeCursor = (cursor: DecodedCursor): string =>
  Buffer.from(JSON.stringify(cursor)).toString('base64');

const extractPackIdFromBucket = (bucket: ScheduledExecutionBucket): string | undefined =>
  bucket.pack_id_hit?.hits?.hits?.[0]?._source?.pack_id;

export const getUnifiedHistoryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/history',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-read`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: schema.object({
              pageSize: schema.number({ defaultValue: 20, min: 1, max: 100 }),
              nextPage: schema.maybe(schema.string()),
              kuery: schema.maybe(schema.string()),
              userIds: schema.maybe(schema.string()),
              sourceFilters: schema.maybe(schema.string()),
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
            nextPage,
            kuery,
            userIds: userIdsRaw,
            sourceFilters: sourceFiltersRaw,
            startDate,
            endDate,
          } = request.query;

          const decoded = decodeCursor(nextPage);
          const userIds = userIdsRaw ? userIdsRaw.split(',').filter(Boolean) : undefined;

          const activeFilters: Set<SourceFilter> | undefined = sourceFiltersRaw
            ? new Set(sourceFiltersRaw.split(',').filter(Boolean) as SourceFilter[])
            : undefined;

          const includeLive =
            !activeFilters || activeFilters.has('live') || activeFilters.has('rule');
          const includeScheduled = !activeFilters || activeFilters.has('scheduled');

          const fetchSize = pageSize + 1;

          const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
            osqueryContext,
            request
          );

          let packIdsForQuery: string[] | undefined;
          if (kuery && includeScheduled) {
            const packResults = await spaceScopedClient.find<PackSavedObject>({
              type: packSavedObjectType,
              search: kuery,
              searchFields: ['name'],
              perPage: 1000,
            });
            packIdsForQuery = packResults.saved_objects.map((so) => so.id);
          }

          const actionsQuery = includeLive
            ? buildLiveActionsQuery({
                pageSize: fetchSize,
                searchAfter: decoded.actionSearchAfter,
                kuery,
                userIds,
                spaceId,
                startDate,
                endDate,
              })
            : undefined;

          const scheduledOffset = decoded.scheduledOffset ?? 0;

          const scheduledQuery = includeScheduled
            ? buildScheduledResponsesQuery({
                cursor: decoded.scheduledCursor,
                scheduledOffset,
                pageSize,
                packIds: packIdsForQuery,
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
          const liveRows: LiveHistoryRow[] = liveHits.map(mapLiveHitToRow);

          const sortValuesMap = new Map<string, SortValues>();
          for (const hit of liveHits) {
            if (hit.sort) {
              const actionId =
                hit.fields?.action_id ?? (hit._source as Record<string, unknown>)?.action_id;
              const id = Array.isArray(actionId) ? actionId[0] : actionId;
              if (typeof id === 'string') {
                sortValuesMap.set(id, hit.sort);
              }
            }
          }

          const filteredLiveRows = activeFilters
            ? liveRows.filter((row) => {
                if (row.source === 'Rule') return activeFilters.has('rule');

                return activeFilters.has('live');
              })
            : liveRows;

          const scheduledAgg = (scheduledResult.aggregations as ScheduledAggregations)
            ?.scheduled_executions;
          const scheduledBuckets: ScheduledExecutionBucket[] = scheduledAgg?.buckets ?? [];

          const bucketPackIds = scheduledBuckets
            .map(extractPackIdFromBucket)
            .filter((id): id is string => !!id);
          const uniquePackIds = [...new Set(bucketPackIds)];

          let packSOs: Array<{ id: string; attributes: PackSavedObject }>;
          if (uniquePackIds.length > 0) {
            const bulkResult = await spaceScopedClient.bulkGet<PackSavedObject>(
              uniquePackIds.map((id) => ({ id, type: packSavedObjectType }))
            );
            packSOs = bulkResult.saved_objects
              .filter((so) => !so.error)
              .map((so) => ({ id: so.id, attributes: so.attributes }));
          } else if (scheduledBuckets.length > 0) {
            packSOs = await loadAllPacks(spaceScopedClient);
          } else {
            packSOs = [];
          }

          const packLookup = buildPackLookup(packSOs);

          const allScheduledRows: ScheduledHistoryRow[] = scheduledBuckets.map((bucket) => {
            const scheduleId = bucket.key[0];
            const executionCount = bucket.key[1];
            const bucketPackId = extractPackIdFromBucket(bucket);
            const packContext = packLookup.get(scheduleId);

            return {
              id: `${scheduleId}_${executionCount}`,
              sourceType: 'scheduled' as const,
              timestamp: bucket.max_timestamp.value_as_string,
              plannedTime: bucket.planned_time.value_as_string,
              queryText: packContext?.queryText ?? '',
              queryName: packContext?.queryName,
              source: 'Scheduled' as const,
              packName: packContext?.packName,
              packId: packContext?.packId ?? bucketPackId,
              spaceId,
              agentCount: bucket.agent_count.value,
              successCount: bucket.success_count.doc_count,
              errorCount: bucket.error_count.doc_count,
              totalRows: bucket.total_rows.value,
              scheduleId,
              executionCount,
            };
          });

          const mergeResult = mergeRows<UnifiedHistoryRow>(
            filteredLiveRows,
            allScheduledRows,
            pageSize,
            scheduledOffset
          );

          // Compute the live search_after cursor: find the last live row on the
          // page and look up its ES sort values. If no live rows appeared on this
          // page, carry forward the previous cursor so the live stream resumes
          // from where it left off instead of restarting from the beginning.
          let nextSortValues: SortValues | undefined;
          for (let i = mergeResult.rows.length - 1; i >= 0; i--) {
            const row = mergeResult.rows[i];
            if (row.sourceType === 'live' && row.actionId) {
              nextSortValues = sortValuesMap.get(row.actionId);
              if (nextSortValues) break;
            }
          }

          const nextActionSearchAfter = nextSortValues ?? decoded.actionSearchAfter;

          // Compute the scheduled cursor + offset using planned_schedule_time
          // (deterministic per execution, unlike @timestamp which varies per agent).
          // The cursor is the planned_time of the last scheduled row on this page.
          // The offset counts how many buckets at that exact planned_time we have
          // already consumed. When the cursor advances (new planned_time), the
          // offset resets to only the boundary count on this page.
          let nextScheduledCursor = decoded.scheduledCursor;
          let nextScheduledOffset = scheduledOffset;

          const scheduledOnPage = mergeResult.rows.filter(
            (r): r is ScheduledHistoryRow => r.sourceType === 'scheduled'
          );

          if (scheduledOnPage.length > 0) {
            const lastPlannedTime = scheduledOnPage[scheduledOnPage.length - 1].plannedTime;
            const boundaryCount = scheduledOnPage.filter(
              (r) => r.plannedTime === lastPlannedTime
            ).length;

            if (lastPlannedTime && lastPlannedTime !== decoded.scheduledCursor) {
              nextScheduledCursor = lastPlannedTime;
              nextScheduledOffset = boundaryCount;
            } else {
              nextScheduledOffset = scheduledOffset + mergeResult.scheduledConsumedOnPage;
            }
          }

          let nextPageToken: string | undefined;
          if (mergeResult.hasMore) {
            nextPageToken = encodeCursor({
              actionSearchAfter: nextActionSearchAfter,
              scheduledCursor: nextScheduledCursor,
              scheduledOffset: nextScheduledOffset,
            });
          }

          const body: UnifiedHistoryResponse = {
            data: mergeResult.rows,
            nextPage: nextPageToken,
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

async function loadAllPacks(
  soClient: Pick<
    ReturnType<typeof createInternalSavedObjectsClientForSpaceId> extends Promise<infer T>
      ? T
      : never,
    'find'
  >
): Promise<Array<{ id: string; attributes: PackSavedObject }>> {
  const perPage = 1000;
  const firstPage = await soClient.find<PackSavedObject>({
    type: packSavedObjectType,
    perPage,
  });
  let packSOs = firstPage.saved_objects as Array<{
    id: string;
    attributes: PackSavedObject;
  }>;
  const totalPages = Math.ceil(firstPage.total / perPage);
  for (let page = 2; page <= totalPages; page++) {
    const nextP = await soClient.find<PackSavedObject>({
      type: packSavedObjectType,
      perPage,
      page,
    });
    packSOs = packSOs.concat(
      nextP.saved_objects as Array<{
        id: string;
        attributes: PackSavedObject;
      }>
    );
  }

  return packSOs;
}
