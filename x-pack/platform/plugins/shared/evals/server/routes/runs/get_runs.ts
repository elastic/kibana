/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_RUNS_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  EVALUATIONS_INDEX_PATTERN,
  buildRouteValidationWithZod,
  GetEvaluationRunsRequestQuery,
  buildRunsListingFilterQuery,
  buildRunsListingAggregation,
  parseRunsListingResponse,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerGetRunsRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_RUNS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'List evaluation runs',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetEvaluationRunsRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const {
            suite_id: suiteId,
            model_id: modelId,
            branch,
            page,
            per_page: perPage,
          } = request.query;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const pagination = { page, perPage };
          const aggResponse = await esClient.search({
            index: EVALUATIONS_INDEX_PATTERN,
            size: 0,
            query: buildRunsListingFilterQuery({ suiteId, modelId, branch }),
            aggs: buildRunsListingAggregation(pagination),
          });

          return response.ok({
            body: parseRunsListingResponse(aggResponse.aggregations, pagination),
          });
        } catch (error) {
          logger.error(`Failed to list evaluation runs: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list evaluation runs' },
          });
        }
      }
    );
};
