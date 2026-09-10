/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_EXPERIMENT_PROTOCOL_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  buildExperimentFilterQuery,
  buildProtocolAggregation,
  parseProtocolAggregationResponse,
  buildModelDisplayId,
  GetEvaluationExperimentProtocolRequestParams,
  GetEvaluationExperimentProtocolRequestQuery,
} from '@kbn/evals-common';
import type { GetEvaluationExperimentProtocolResponse } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import type { EvalDocSource } from './types';

export const registerGetExperimentProtocolRoute = ({
  router,
  logger,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXPERIMENT_PROTOCOL_URL,
      access: INTERNAL_API_ACCESS,
      enableQueryVersion: true,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get evaluation experiment protocol and execution summary',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetEvaluationExperimentProtocolRequestParams),
            query: buildRouteValidationWithZod(GetEvaluationExperimentProtocolRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { experimentId } = request.params;
          const { suite_id: suiteId, model_id: modelId } = request.query;
          const evalsContext = await context.evals;
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

          const query = buildExperimentFilterQuery(experimentId, {
            suiteId,
            modelId,
            spaceId,
          });

          const searchResponse = await evalsContext.evaluationScoreService.search({
            query,
            size: 1,
            aggs: buildProtocolAggregation(),
          });

          const firstDoc = searchResponse.hits?.hits[0]?._source as EvalDocSource | undefined;
          if (!firstDoc) {
            return response.notFound({
              body: { message: `Experiment not found for experiment: ${experimentId}` },
            });
          }

          const aggregates = parseProtocolAggregationResponse(
            searchResponse.aggregations as Record<string, unknown> | undefined
          );

          const taskModel = firstDoc.task?.model;

          const body: GetEvaluationExperimentProtocolResponse = {
            experiment_id: experimentId,
            protocol: {
              experiment_name: firstDoc.experiment_name ?? null,
              ...(taskModel && {
                task_model: {
                  id: buildModelDisplayId(taskModel.id, taskModel.family, taskModel.provider),
                  family: taskModel.family,
                  provider: taskModel.provider,
                },
              }),
              total_repetitions: aggregates.total_repetitions,
              datasets: aggregates.datasets,
              evaluators: aggregates.evaluators,
            },
            execution: {
              execution_id: firstDoc.metadata?.execution_id,
              suite_id: firstDoc.metadata?.suite_id ?? null,
              first_score_at: aggregates.first_score_at,
              last_score_at: aggregates.last_score_at,
              git_branch: firstDoc.metadata?.git?.branch ?? null,
              git_commit_sha: firstDoc.metadata?.git?.commit_sha ?? null,
              ci: firstDoc.metadata?.ci,
              hostname: firstDoc.metadata?.hostname,
            },
          };

          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to get evaluation experiment protocol: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get evaluation experiment protocol' },
          });
        }
      }
    );
};
