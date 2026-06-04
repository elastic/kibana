/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_EXPERIMENT_SCORES_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  buildExperimentFilterQuery,
  SCORES_SORT_ORDER,
  GetEvaluationExperimentScoresRequestParams,
  GetEvaluationExperimentScoresRequestQuery,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';

export const registerGetExperimentScoresRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXPERIMENT_SCORES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get evaluation experiment scores',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetEvaluationExperimentScoresRequestParams),
            query: buildRouteValidationWithZod(GetEvaluationExperimentScoresRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { experimentId } = request.params;
          const { suite_id: suiteId, model_id: modelId, execution_id: executionId } = request.query;
          const evalsContext = await context.evals;

          const filterId = executionId ?? experimentId;
          const filterField = executionId ? 'metadata.execution_id' : 'experiment_id';
          const query = buildExperimentFilterQuery(filterId, {
            suiteId,
            modelId,
            filterField,
          });

          const searchResponse = await evalsContext.evaluationScoreService.search({
            query,
            sort: SCORES_SORT_ORDER,
            size: 10000,
          });

          const hits = searchResponse.hits?.hits ?? [];
          const scores = hits
            .map((hit) => hit._source)
            .filter((source): source is Record<string, unknown> => source !== undefined);

          return response.ok({
            body: { scores, total: scores.length },
          });
        } catch (error) {
          logger.error(`Failed to get evaluation experiment scores: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get evaluation experiment scores' },
          });
        }
      }
    );
};
