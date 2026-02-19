/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import { packSavedObjectType } from '../../../common/types';
import { OsqueryQueries } from '../../../common/search_strategy';
import type {
  UnifiedHistoryRequestOptions,
  UnifiedHistoryStrategyResponse,
  UnifiedHistoryRow,
} from '../../../common/search_strategy/osquery/unified_history';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

const getUnifiedHistoryRequestQuerySchema = t.type({
  pageSize: t.union([toNumberRt, t.undefined]),
  cursor: t.union([t.string, t.undefined]),
  sortOrder: t.union([t.string, t.undefined]),
  kuery: t.union([t.string, t.undefined]),
});

type GetUnifiedHistoryRequestQuerySchema = t.OutputOf<typeof getUnifiedHistoryRequestQuerySchema>;

export const getUnifiedHistoryRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
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
            query: buildRouteValidation<
              typeof getUnifiedHistoryRequestQuerySchema,
              GetUnifiedHistoryRequestQuerySchema
            >(getUnifiedHistoryRequestQuerySchema),
          },
        },
      },
      async (context, request, response) => {
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);

        try {
          const spaceId = osqueryContext?.service?.getActiveSpace
            ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
            : DEFAULT_SPACE_ID;

          const pageSize = request.query.pageSize ?? 20;
          const cursor = request.query.cursor;

          const search = await context.search;

          const res = await lastValueFrom(
            search.search<UnifiedHistoryRequestOptions, UnifiedHistoryStrategyResponse>(
              {
                factoryQueryType: OsqueryQueries.unifiedHistory,
                kuery: request.query.kuery,
                pageSize,
                cursor,
                spaceId,
              },
              { abortSignal, strategy: 'osquerySearchStrategy' }
            )
          );

          // Enrich scheduled rows with pack names from saved objects
          const scheduleIds = [
            ...new Set(
              res.rows
                .filter((row: UnifiedHistoryRow) => row.rowType === 'scheduled' && row.scheduleId)
                .map((row: UnifiedHistoryRow) => row.scheduleId!)
            ),
          ];

          if (scheduleIds.length > 0) {
            try {
              const coreContext = await context.core;
              const soClient = coreContext.savedObjects.client;

              const packResults = await soClient.bulkGet(
                scheduleIds.map((id) => ({ type: packSavedObjectType, id }))
              );

              const packInfoMap = new Map<string, { name: string; queryCount: number }>();
              for (const so of packResults.saved_objects) {
                if (!so.error && so.attributes) {
                  const attrs = so.attributes as any;
                  const queries = attrs.queries;
                  const queryCount = queries
                    ? Object.keys(queries).length
                    : 0;
                  packInfoMap.set(so.id, {
                    name: attrs.name ?? so.id,
                    queryCount,
                  });
                }
              }

              for (const row of res.rows) {
                if (row.rowType === 'scheduled' && row.scheduleId) {
                  const packInfo = packInfoMap.get(row.scheduleId);
                  row.packName = packInfo?.name ?? row.scheduleId;
                  row.queryCount = packInfo?.queryCount;
                }
              }
            } catch {
              // If pack name resolution fails, leave names as-is
            }
          }

          return response.ok({
            body: {
              rows: res.rows,
              total: res.total,
              nextCursor: res.nextCursor,
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
