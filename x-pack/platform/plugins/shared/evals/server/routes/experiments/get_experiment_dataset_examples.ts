/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_EXPERIMENT_DATASET_EXAMPLES_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  MAX_SCORES_PER_QUERY,
  buildDatasetExampleScoresQuery,
  SCORES_SORT_ORDER,
  GetEvaluationExperimentDatasetExamplesRequestParams,
  GetEvaluationExperimentDatasetExamplesRequestQuery,
  type EvaluationScoreDocument,
  type GetEvaluationExperimentDatasetExamplesResponse,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';

type GroupedExampleScores = GetEvaluationExperimentDatasetExamplesResponse['examples'][number];

const getExampleId = ({ example }: EvaluationScoreDocument): string => example.id;

const getExampleIndex = ({ example }: EvaluationScoreDocument): number | null =>
  example.index ?? null;

const isValidScoreDocument = (source: unknown): source is EvaluationScoreDocument => {
  if (source === null || source === undefined || typeof source !== 'object') {
    return false;
  }

  const maybeScore = source as { example?: { id?: unknown } };
  return typeof maybeScore.example?.id === 'string' && maybeScore.example.id.length > 0;
};

export const registerGetExperimentDatasetExamplesRoute = ({
  router,
  logger,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXPERIMENT_DATASET_EXAMPLES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get experiment dataset example scores',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(
              GetEvaluationExperimentDatasetExamplesRequestParams
            ),
            query: buildRouteValidationWithZod(GetEvaluationExperimentDatasetExamplesRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { experimentId, datasetId } = request.params;
          const { execution_id: executionId } = request.query;
          const evalsContext = await context.evals;

          const filterId = executionId ?? experimentId;
          const filterField = executionId ? 'metadata.execution_id' : 'experiment_id';
          const searchResponse = await evalsContext.evaluationScoreService.search({
            query: buildDatasetExampleScoresQuery(datasetId, filterId, { filterField }),
            sort: SCORES_SORT_ORDER,
            size: MAX_SCORES_PER_QUERY,
          });

          const scores = (searchResponse.hits?.hits ?? [])
            .map((hit) => hit._source)
            .filter(isValidScoreDocument);

          const groupedExamplesById = new Map<string, GroupedExampleScores>();
          for (const score of scores) {
            const exampleId = getExampleId(score);
            const existingGroup = groupedExamplesById.get(exampleId);
            if (existingGroup) {
              existingGroup.scores.push(score);
              continue;
            }

            groupedExamplesById.set(exampleId, {
              example_id: exampleId,
              example_index: getExampleIndex(score),
              scores: [score],
            });
          }

          const examples = Array.from(groupedExamplesById.values()).sort((left, right) => {
            if (left.example_index === null) return 1;
            if (right.example_index === null) return -1;
            return left.example_index - right.example_index;
          });

          return response.ok({
            body: { examples },
          });
        } catch (error) {
          logger.error(`Failed to get experiment dataset examples: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get experiment dataset examples' },
          });
        }
      }
    );
};
