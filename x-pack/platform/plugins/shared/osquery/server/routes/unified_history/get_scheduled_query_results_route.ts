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

import { PLUGIN_ID } from '../../../common';
import { API_VERSIONS } from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { OsqueryQueries, Direction } from '../../../common/search_strategy';
import type {
  ResultsRequestOptions,
  ResultsStrategyResponse,
} from '../../../common/search_strategy';
import { generateTablePaginationOptions } from '../../../common/utils/build_query';

/**
 * Returns query result rows for a scheduled execution.
 * Reuses the same results factory (OsqueryQueries.results) as live queries,
 * passing scheduleId + executionCount instead of actionId as the identifier.
 */
export const getScheduledQueryResultsRoute = (
  router: IRouter<DataRequestHandlerContext>,
  osqueryContext: OsqueryAppContext
) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/scheduled_results/{scheduleId}/{executionCount}/results',
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
            query: schema.object({
              page: schema.maybe(schema.number()),
              pageSize: schema.maybe(schema.number()),
              sort: schema.maybe(schema.string()),
              sortOrder: schema.maybe(schema.string()),
              kuery: schema.maybe(schema.string()),
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

          const page = request.query.page ?? 0;
          const pageSize = request.query.pageSize ?? 100;

          const search = await context.search;

          const res = await lastValueFrom(
            search.search<ResultsRequestOptions, ResultsStrategyResponse>(
              {
                scheduleId,
                executionCount,
                factoryQueryType: OsqueryQueries.results,
                pagination: generateTablePaginationOptions(page, pageSize),
                sort: [
                  {
                    direction: (request.query.sortOrder as Direction) ?? Direction.desc,
                    field: request.query.sort ?? '@timestamp',
                  },
                ],
              },
              { abortSignal, strategy: 'osquerySearchStrategy' }
            )
          );

          return response.ok({
            body: {
              data: res,
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
