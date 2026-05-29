/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_EXAMPLE_SCORES_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  EVALUATIONS_INDEX_PATTERN,
  MAX_SCORES_PER_QUERY,
  buildExampleScoresQuery,
  SCORES_SORT_ORDER,
  GetExampleScoresRequestParams,
  type EvaluationScoreDocument,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';

const EXAMPLE_SCORES_SORT_ORDER = [
  { '@timestamp': { order: 'desc' as const } },
  ...SCORES_SORT_ORDER,
];

export const registerGetExampleScoresRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXAMPLE_SCORES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get example scores',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetExampleScoresRequestParams),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { exampleId } = request.params;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const searchResponse = await esClient.search({
            index: EVALUATIONS_INDEX_PATTERN,
            query: buildExampleScoresQuery(exampleId),
            sort: EXAMPLE_SCORES_SORT_ORDER,
            size: MAX_SCORES_PER_QUERY,
          });

          const hits = searchResponse.hits?.hits ?? [];
          const scores = hits
            .map((hit) => hit._source)
            .filter((source): source is EvaluationScoreDocument => source !== undefined);

          return response.ok({
            body: { scores, total: scores.length },
          });
        } catch (error) {
          logger.error(`Failed to get example scores: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get example scores' },
          });
        }
      }
    );
};
