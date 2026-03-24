/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';

import { PLUGIN_ID } from '../../../common';
import {
  API_VERSIONS,
  ACTIONS_INDEX,
  ACTION_RESPONSES_DATA_STREAM_INDEX,
} from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import type {
  UnifiedHistoryRow,
  UnifiedHistoryResponse,
  SourceFilter,
} from '../../../common/api/unified_history/types';
import { buildLiveActionsQuery } from './query_live_actions_dsl';
import { buildScheduledResponsesQuery } from './query_scheduled_responses_dsl';
import { mergeRows } from './merge_rows';
import { decodeCursor, encodeCursor, computePaginationCursors } from './cursor_utils';
import { processLiveHistory } from './process_live_history';
import {
  getPacksForSpace,
  resolvePackFilterForKuery,
  processScheduledHistory,
  type ScheduledAggregations,
} from './process_scheduled_history';
import type { LiveActionHit } from './map_live_hit_to_row';

const VALID_SOURCE_FILTERS = new Set(['live', 'rule', 'scheduled']);

export const getUnifiedHistoryRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  const logger: Logger = osqueryContext.logFactory.get('unifiedHistory');
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
              sourceFilters: schema.maybe(
                schema.string({
                  validate: (value) => {
                    const tokens = value.split(',').filter(Boolean);
                    const invalid = tokens.filter((t) => !VALID_SOURCE_FILTERS.has(t));
                    if (invalid.length) {
                      return `invalid sourceFilter values: ${invalid.join(
                        ', '
                      )}. Allowed: live, rule, scheduled`;
                    }
                  },
                })
              ),
              startDate: schema.maybe(schema.string()),
              endDate: schema.maybe(schema.string()),
              tags: schema.maybe(schema.string()),
              sortDirection: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
                defaultValue: 'desc',
              }),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asInternalUser;

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
            tags: tagsRaw,
            sortDirection,
          } = request.query;

          const decoded = decodeCursor(nextPage);
          const userIds = userIdsRaw ? userIdsRaw.split(',').filter(Boolean) : undefined;
          let tags: string[] | undefined;
          if (tagsRaw) {
            try {
              tags = JSON.parse(tagsRaw);
            } catch {
              tags = tagsRaw.split(',').filter(Boolean);
            }
          }

          const activeFilters: Set<SourceFilter> | undefined = sourceFiltersRaw
            ? new Set(sourceFiltersRaw.split(',').filter(Boolean) as SourceFilter[])
            : undefined;

          const hasUserFilter = userIds && userIds.length > 0;
          const hasTagsFilter = tags && tags.length > 0;
          const includeLive =
            !activeFilters || activeFilters.has('live') || activeFilters.has('rule');
          // Scheduled queries are excluded when user or tags filters are active because
          // scheduled execution docs don't carry user_id or tags fields.
          const includeScheduled =
            (!activeFilters || activeFilters.has('scheduled')) && !hasUserFilter && !hasTagsFilter;

          const fetchSize = pageSize + 1;

          const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
            osqueryContext,
            request
          );

          // Fetch all packs once — used for both kuery filtering and
          // resolving query names on scheduled rows.
          const packSOs = includeScheduled ? await getPacksForSpace(spaceScopedClient) : [];

          let packIdsForQuery: string[] | undefined;
          let scheduleIdsForQuery: string[] | undefined;
          if (kuery && includeScheduled) {
            const resolved = resolvePackFilterForKuery(packSOs, kuery);
            packIdsForQuery = resolved.packIds;
            scheduleIdsForQuery = resolved.scheduleIds;
          }

          const actionsQuery = includeLive
            ? buildLiveActionsQuery({
                pageSize: fetchSize,
                searchAfter: decoded.actionSearchAfter,
                kuery,
                userIds,
                tags,
                spaceId,
                startDate,
                endDate,
                sortDirection,
              })
            : undefined;

          const scheduledOffset = decoded.scheduledOffset ?? 0;

          const scheduledQuery = includeScheduled
            ? buildScheduledResponsesQuery({
                cursor: decoded.scheduledCursor,
                scheduledOffset,
                pageSize,
                packIds: packIdsForQuery,
                scheduleIds: scheduleIdsForQuery,
                spaceId,
                startDate,
                endDate,
                sortDirection,
              })
            : undefined;

          const emptyScheduledResult = { aggregations: {} as ScheduledAggregations };

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
              ? esClient
                  .search(
                    {
                      index: `${ACTION_RESPONSES_DATA_STREAM_INDEX}-*`,
                      ...scheduledQuery,
                    },
                    { ignore: [404] }
                  )
                  .catch((err) => {
                    // Graceful degradation: if the osquery integration has not been
                    // upgraded yet, `planned_schedule_time` may be mapped as `keyword`
                    // instead of `date`, which makes the `max` aggregation fail.
                    // Return empty scheduled results until the integration is updated.`````
                    logger.warn(
                      `Scheduled query aggregation failed (likely outdated integration mappings): ${err.message}`
                    );

                    return emptyScheduledResult;
                  })
              : Promise.resolve(emptyScheduledResult),
          ]);

          const liveHits = (actionsResult.hits?.hits ?? []) as LiveActionHit[];

          const { liveRows: filteredLiveRows, sortValuesMap } = await processLiveHistory({
            liveHits,
            osqueryContext,
            spaceId,
            activeFilters,
            logger,
          });

          const scheduledAgg = (scheduledResult.aggregations as ScheduledAggregations)
            ?.scheduled_executions;
          const scheduledBuckets = scheduledAgg?.buckets ?? [];

          const allScheduledRows = processScheduledHistory({
            scheduledBuckets,
            packSOs,
            spaceId,
          });

          const mergeResult = mergeRows<UnifiedHistoryRow>(
            filteredLiveRows,
            allScheduledRows,
            pageSize,
            scheduledOffset,
            sortDirection
          );

          const { nextActionSearchAfter, nextScheduledCursor, nextScheduledOffset } =
            computePaginationCursors({
              mergeResult,
              sortValuesMap,
              decoded,
              scheduledOffset,
            });

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
          logger.error(`Failed to fetch unified history: ${error.message}`);

          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to fetch query history' },
          });
        }
      }
    );
};
