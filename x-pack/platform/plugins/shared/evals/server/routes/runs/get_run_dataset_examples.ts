/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_RUN_DATASET_EXAMPLES_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  EVALUATIONS_INDEX_PATTERN,
  MAX_SCORES_PER_QUERY,
  buildRouteValidationWithZod,
  buildDatasetExampleScoresQuery,
  SCORES_SORT_ORDER,
  GetEvaluationRunDatasetExamplesRequestParams,
  type EvaluationScoreDocument,
  type GetEvaluationRunDatasetExamplesResponse,
} from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

type GroupedExampleScores = GetEvaluationRunDatasetExamplesResponse['examples'][number];

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

export const registerGetRunDatasetExamplesRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_RUN_DATASET_EXAMPLES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Get run dataset example scores',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetEvaluationRunDatasetExamplesRequestParams),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { runId, datasetId } = request.params;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const searchResponse = await esClient.search({
            index: EVALUATIONS_INDEX_PATTERN,
            query: buildDatasetExampleScoresQuery(datasetId, runId),
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
          logger.error(`Failed to get run dataset examples: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get run dataset examples' },
          });
        }
      }
    );
};
