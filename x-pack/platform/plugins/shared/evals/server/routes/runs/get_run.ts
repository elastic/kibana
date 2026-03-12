/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_RUN_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  EVALUATIONS_INDEX_PATTERN,
  buildRouteValidationWithZod,
  buildRunFilterQuery,
  buildStatsAggregation,
  parseStatsAggregationResponse,
  buildModelDisplayId,
  GetEvaluationRunRequestParams,
  GetEvaluationRunRequestQuery,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

interface EvalDocSource {
  task?: { model?: { id?: string; family?: string; provider?: string } };
  evaluator?: { model?: { id?: string; family?: string; provider?: string } };
  run_metadata?: { total_repetitions?: number };
}

export const registerGetRunRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_RUN_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Get evaluation run detail',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetEvaluationRunRequestParams),
            query: buildRouteValidationWithZod(GetEvaluationRunRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { runId } = request.params;
          const { suite_id: suiteId, model_id: modelId } = request.query;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const query = buildRunFilterQuery(runId, { suiteId, modelId });

          const metadataResponse = await esClient.search<EvalDocSource>({
            index: EVALUATIONS_INDEX_PATTERN,
            query,
            size: 1,
          });

          const firstDoc = metadataResponse.hits?.hits[0]?._source;
          if (!firstDoc) {
            return response.notFound({ body: { message: `Run not found: ${runId}` } });
          }

          const aggResponse = await esClient.search({
            index: EVALUATIONS_INDEX_PATTERN,
            size: 0,
            query,
            aggs: buildStatsAggregation(),
          });

          const stats = parseStatsAggregationResponse(
            aggResponse.aggregations as Record<string, unknown> | undefined
          );

          const toModelDisplay = (model?: { id?: string; family?: string; provider?: string }) => {
            if (!model) return undefined;
            return {
              id: buildModelDisplayId(model.id, model.family, model.provider),
              family: model.family,
              provider: model.provider,
            };
          };

          return response.ok({
            body: {
              run_id: runId,
              task_model: toModelDisplay(firstDoc.task?.model),
              evaluator_model: toModelDisplay(firstDoc.evaluator?.model),
              total_repetitions: firstDoc.run_metadata?.total_repetitions ?? 1,
              stats,
            },
          });
        } catch (error) {
          logger.error(`Failed to get evaluation run: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get evaluation run' },
          });
        }
      }
    );
};
