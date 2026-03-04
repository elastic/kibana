/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';

import { PLUGIN_ID } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { packSavedObjectType } from '../../../common/types';
import type { PackSavedObject } from '../../common/types';
import { OsqueryQueries, Direction } from '../../../common/search_strategy';
import { buildPackLookup } from './pack_lookup';
import type {
  ScheduledActionResultsRequestOptions,
  ScheduledActionResultsStrategyResponse,
} from '../../../common/search_strategy';
import { generateTablePaginationOptions } from '../../../common/utils/build_query';

export const getScheduledExecutionDetailsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/history/scheduled/{scheduleId}/{executionCount}',
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
            params: schema.object({
              scheduleId: schema.string(),
              executionCount: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);

        try {
          const { scheduleId, executionCount: executionCountStr } = request.params;
          const executionCount = Number(executionCountStr);

          if (isNaN(executionCount) || executionCount < 0) {
            return response.customError({
              statusCode: 400,
              body: {
                message: `executionCount must be a non-negative integer, got: "${executionCountStr}"`,
              },
            });
          }

          // 1. Look up pack context to find packName, queryId, queryText
          const spaceId = osqueryContext?.service?.getActiveSpace
            ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
            : DEFAULT_SPACE_ID;

          const packCache = osqueryContext.service.getPackLookupCache();
          let packSOs = packCache.get(spaceId);
          if (!packSOs) {
            const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
              osqueryContext,
              request
            );
            const packResults = await spaceScopedClient.find<PackSavedObject>({
              type: packSavedObjectType,
              perPage: 1000,
            });
            packSOs = packResults.saved_objects as Array<{
              id: string;
              attributes: PackSavedObject;
            }>;
            packCache.set(spaceId, packSOs);
          }

          const packLookup = buildPackLookup(packSOs);
          const packContext = packLookup.get(scheduleId);
          const packName = packContext?.packName;
          const queryText = packContext?.queryText;

          const search = await context.search;

          // 2. Fetch stats via aggregations (size: 1 just for timestamp)
          const actionRes = await lastValueFrom(
            search.search<
              ScheduledActionResultsRequestOptions,
              ScheduledActionResultsStrategyResponse
            >(
              {
                scheduleId,
                executionCount,
                factoryQueryType: OsqueryQueries.scheduledActionResults,
                pagination: generateTablePaginationOptions(0, 1),
                sort: {
                  direction: Direction.desc,
                  field: '@timestamp',
                },
              },
              { abortSignal, strategy: 'osquerySearchStrategy' }
            )
          );

          const responseAgg = actionRes.rawResponse?.aggregations?.aggs?.responses_by_action_id;
          const totalResponded = responseAgg?.doc_count ?? 0;
          const totalRows = responseAgg?.rows_count?.value ?? 0;
          const aggsBuckets = responseAgg?.responses?.buckets;
          const successCount =
            aggsBuckets?.find((bucket) => bucket.key === 'success')?.doc_count ?? 0;
          const errorCount = aggsBuckets?.find((bucket) => bucket.key === 'error')?.doc_count ?? 0;

          const timestamp =
            actionRes.edges.length > 0
              ? ((actionRes.edges[0]._source ?? {}) as Record<string, unknown>)['@timestamp']
              : undefined;

          return response.ok({
            body: {
              scheduleId,
              executionCount,
              packName,
              queryText: queryText ?? '',
              timestamp,
              agentCount: totalResponded,
              successCount,
              errorCount,
              totalRows,
            },
          });
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
