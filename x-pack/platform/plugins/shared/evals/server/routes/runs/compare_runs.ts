/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_RUNS_COMPARE_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  EVALUATIONS_INDEX_PATTERN,
  buildRouteValidationWithZod,
  buildRunFilterQuery,
  SCORES_SORT_ORDER,
  CompareRunsRequestQuery,
  pairScores,
  computePairedTTestResults,
} from '@kbn/evals-common';
import type { EvaluationScoreDocument } from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import type { RouteDependencies } from '../register_routes';

const MAX_SCORES_PER_RUN = 10_000;

export const registerCompareRunsRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_RUNS_COMPARE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Compare two evaluation runs',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(CompareRunsRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { run_id_a: runIdA, run_id_b: runIdB } = request.query;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const [responseA, responseB] = await Promise.all([
            esClient.search<EvaluationScoreDocument>({
              index: EVALUATIONS_INDEX_PATTERN,
              query: buildRunFilterQuery(runIdA),
              sort: SCORES_SORT_ORDER,
              size: MAX_SCORES_PER_RUN,
            }),
            esClient.search<EvaluationScoreDocument>({
              index: EVALUATIONS_INDEX_PATTERN,
              query: buildRunFilterQuery(runIdB),
              sort: SCORES_SORT_ORDER,
              size: MAX_SCORES_PER_RUN,
            }),
          ]);

          const scoresA = (responseA.hits?.hits ?? [])
            .map((hit) => hit._source)
            .filter((source): source is EvaluationScoreDocument => source !== undefined);

          const scoresB = (responseB.hits?.hits ?? [])
            .map((hit) => hit._source)
            .filter((source): source is EvaluationScoreDocument => source !== undefined);

          if (scoresA.length === 0) {
            return response.notFound({ body: { message: `No scores found for run: ${runIdA}` } });
          }
          if (scoresB.length === 0) {
            return response.notFound({ body: { message: `No scores found for run: ${runIdB}` } });
          }

          const datasetsA = new Set(scoresA.map((s) => s.example.dataset.id));
          const datasetsB = new Set(scoresB.map((s) => s.example.dataset.id));
          const overlapping = [...datasetsA].filter((id) => datasetsB.has(id));

          if (overlapping.length === 0) {
            return response.ok({
              body: {
                results: [],
                pairing: { totalPairs: 0, skippedMissingPairs: 0, skippedNullScores: 0 },
              },
            });
          }

          const overlappingSet = new Set(overlapping);
          const filteredA = scoresA.filter((s) => overlappingSet.has(s.example.dataset.id));
          const filteredB = scoresB.filter((s) => overlappingSet.has(s.example.dataset.id));

          const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
            filteredA,
            filteredB
          );
          const results = computePairedTTestResults(filteredA, filteredB);

          return response.ok({
            body: {
              results,
              pairing: {
                totalPairs: pairs.length,
                skippedMissingPairs,
                skippedNullScores,
              },
            },
          });
        } catch (error) {
          logger.error(`Failed to compare evaluation runs: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to compare evaluation runs' },
          });
        }
      }
    );
};
