/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { lastValueFrom } from 'rxjs';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import { PLUGIN_ID } from '../../../common';
import { packSavedObjectType } from '../../../common/types';
import { API_VERSIONS, DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';
import type {
  ScheduledActionResultsRequestOptions,
  ScheduledActionResultsStrategyResponse,
} from '../../../common/search_strategy';
import { Direction, OsqueryQueries } from '../../../common/search_strategy';
import { generateTablePaginationOptions } from '../../../common/utils/build_query';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import type { PackSavedObject } from '../../common/types';

interface ScheduledActionResultsAggregations {
  aggs: {
    responses_by_schedule: {
      rows_count: { value: number };
      responses: {
        buckets: Array<{ key: string; doc_count: number }>;
      };
    };
  };
}

interface ActionResponseHitFields {
  '@timestamp'?: string[];
  pack_id?: string[];
}

export const getScheduledActionResultsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/scheduled_results/{scheduleId}/{executionCount}',
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
            params: schema.object({
              scheduleId: schema.string(),
              executionCount: schema.number(),
            }),
            query: schema.object({
              page: schema.maybe(schema.number()),
              pageSize: schema.maybe(schema.number()),
              sort: schema.maybe(schema.string()),
              sortOrder: schema.maybe(
                schema.oneOf([schema.literal('asc'), schema.literal('desc')])
              ),
              kuery: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, request, response) => {
        const abortSignal = getRequestAbortedSignal(request.events.aborted$);

        try {
          const { scheduleId, executionCount } = request.params;
          const page = request.query.page ?? 0;
          const pageSize = request.query.pageSize ?? 20;

          if (page * pageSize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
            return response.badRequest({
              body: {
                message: `Cannot paginate beyond ${DEFAULT_MAX_TABLE_QUERY_SIZE} results. Use Discover for full access.`,
                attributes: { code: 'PAGINATION_LIMIT_EXCEEDED' },
              },
            });
          }

          const spaceId = osqueryContext?.service?.getActiveSpace
            ? (await osqueryContext.service.getActiveSpace(request))?.id || DEFAULT_SPACE_ID
            : DEFAULT_SPACE_ID;

          const search = await context.search;
          const res = await lastValueFrom(
            search.search<
              ScheduledActionResultsRequestOptions,
              ScheduledActionResultsStrategyResponse
            >(
              {
                scheduleId,
                executionCount,
                spaceId,
                factoryQueryType: OsqueryQueries.scheduledActionResults,
                pagination: generateTablePaginationOptions(page, pageSize),
                sort: {
                  direction: (request.query.sortOrder as Direction) ?? Direction.desc,
                  field: request.query.sort ?? '@timestamp',
                },
              },
              { abortSignal, strategy: 'osquerySearchStrategy' }
            )
          );

          const aggs = res.rawResponse?.aggregations as
            | ScheduledActionResultsAggregations
            | undefined;
          const responsesBySchedule = aggs?.aggs?.responses_by_schedule;
          const rowsCount = responsesBySchedule?.rows_count?.value ?? 0;
          const responsesBuckets = responsesBySchedule?.responses?.buckets;

          const successful = responsesBuckets?.find((b) => b.key === 'success')?.doc_count ?? 0;
          const failed = responsesBuckets?.find((b) => b.key === 'error')?.doc_count ?? 0;

          const total =
            typeof res.rawResponse.hits.total === 'number'
              ? res.rawResponse.hits.total
              : res.rawResponse.hits.total?.value ?? 0;

          const currentPage = page;

          const topHitFields = res.rawResponse.hits.hits[0]?.fields as
            | ActionResponseHitFields
            | undefined;
          const timestamp = topHitFields?.['@timestamp']?.[0] ?? '';
          const packId = topHitFields?.pack_id?.[0] ?? '';

          let packName = '';
          let queryName = '';
          let queryText = '';

          if (packId) {
            try {
              const coreContext = await context.core;
              const soClient = coreContext.savedObjects.client;
              const packSO = await soClient.get<PackSavedObject>(packSavedObjectType, packId);
              packName = packSO.attributes.name || '';

              const matchingQuery = packSO.attributes.queries?.find(
                (q) => q.schedule_id === scheduleId
              );
              if (matchingQuery) {
                queryName = matchingQuery.name || matchingQuery.id || '';
                queryText = matchingQuery.query || '';
              }
            } catch {
              // Pack deleted — gracefully degrade to empty name fields
            }
          }

          return response.ok({
            body: {
              metadata: {
                scheduleId,
                executionCount,
                packId,
                packName,
                queryName,
                queryText,
                timestamp,
              },
              edges: res.edges,
              total,
              currentPage,
              pageSize,
              totalPages: Math.ceil(total / pageSize),
              aggregations: {
                totalRowCount: rowsCount,
                totalResponded: successful + failed,
                successful,
                failed,
                pending: 0,
              },
              inspect: res.inspect,
            },
          });
        } catch (e) {
          return response.customError({
            statusCode: e.statusCode ?? 500,
            body: { message: e.message },
          });
        }
      }
    );
};
