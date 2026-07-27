/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_EXPERIMENTS_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  GetEvaluationExperimentsRequestQuery,
  buildExperimentsListingFilterQuery,
  buildExperimentsListingAggregation,
  parseExperimentsListingResponse,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerGetExperimentsRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXPERIMENTS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'List evaluation experiments',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetEvaluationExperimentsRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const {
            suite_id: suiteId,
            model_id: modelId,
            branch,
            dataset_id: datasetId,
            build_id: buildId,
            page,
            per_page: perPage,
          } = request.query;
          const evalsContext = await context.evals;

          const pagination = { page, perPage };
          const aggResponse = await evalsContext.evaluationScoreService.search({
            size: 0,
            query: buildExperimentsListingFilterQuery({
              suiteId,
              modelId,
              branch,
              datasetId,
              buildId,
            }),
            aggs: buildExperimentsListingAggregation(pagination),
          });

          return response.ok({
            body: parseExperimentsListingResponse(aggResponse.aggregations, pagination),
          });
        } catch (error) {
          logger.error(`Failed to list evaluation experiments: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list evaluation experiments' },
          });
        }
      }
    );
};
