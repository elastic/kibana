/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_EXPERIMENTS_COMPARE_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  buildExperimentFilterQuery,
  SCORES_SORT_ORDER,
  CompareExperimentsRequestQuery,
  pairScores,
  computePairedTTestResults,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { EvaluationScoreDocument } from '@kbn/evals-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';

const MAX_SCORES_PER_EXPERIMENT = 10_000;

const COMPARE_SOURCE_FIELDS = [
  'example.dataset.id',
  'example.dataset.name',
  'example.id',
  'evaluator.name',
  'evaluator.score',
  'task.repetition_index',
];

export const registerCompareExperimentsRoute = ({ router, logger }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXPERIMENTS_COMPARE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Compare two evaluation experiments',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(CompareExperimentsRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { type, baseline_id: idA, target_id: idB } = request.query;
          const filterField = type === 'execution' ? 'metadata.execution_id' : 'experiment_id';

          const evalsContext = await context.evals;

          const [responseA, responseB] = await Promise.all([
            evalsContext.evaluationScoreService.search({
              query: buildExperimentFilterQuery(idA, { filterField }),
              sort: SCORES_SORT_ORDER,
              size: MAX_SCORES_PER_EXPERIMENT,
              _source: COMPARE_SOURCE_FIELDS,
              track_total_hits: true,
            }),
            evalsContext.evaluationScoreService.search({
              query: buildExperimentFilterQuery(idB, { filterField }),
              sort: SCORES_SORT_ORDER,
              size: MAX_SCORES_PER_EXPERIMENT,
              _source: COMPARE_SOURCE_FIELDS,
              track_total_hits: true,
            }),
          ]);

          const totalHitsA =
            typeof responseA.hits.total === 'number'
              ? responseA.hits.total
              : responseA.hits.total?.value ?? 0;
          const totalHitsB =
            typeof responseB.hits.total === 'number'
              ? responseB.hits.total
              : responseB.hits.total?.value ?? 0;
          const truncatedA = totalHitsA > MAX_SCORES_PER_EXPERIMENT;
          const truncatedB = totalHitsB > MAX_SCORES_PER_EXPERIMENT;

          if (truncatedA || truncatedB) {
            logger.warn(
              `Compare experiments: results truncated to ${MAX_SCORES_PER_EXPERIMENT} scores per experiment. ` +
                `A (${idA}): ${totalHitsA} total, B (${idB}): ${totalHitsB} total.`
            );
          }

          const scoresA = (responseA.hits?.hits ?? [])
            .map((hit) => hit._source as EvaluationScoreDocument | undefined)
            .filter((source): source is EvaluationScoreDocument => source !== undefined);

          const scoresB = (responseB.hits?.hits ?? [])
            .map((hit) => hit._source as EvaluationScoreDocument | undefined)
            .filter((source): source is EvaluationScoreDocument => source !== undefined);

          if (scoresA.length === 0) {
            return response.notFound({
              body: { message: `No scores found for ${filterField}: ${idA}` },
            });
          }
          if (scoresB.length === 0) {
            return response.notFound({
              body: { message: `No scores found for ${filterField}: ${idB}` },
            });
          }

          const datasetsA = new Set(scoresA.map((s) => s.example.dataset.id));
          const datasetsB = new Set(scoresB.map((s) => s.example.dataset.id));
          const overlapping = [...datasetsA].filter((id) => datasetsB.has(id));

          if (overlapping.length === 0) {
            return response.ok({
              body: {
                results: [],
                pairing: {
                  totalPairs: 0,
                  skippedMissingPairs: 0,
                  skippedNullScores: 0,
                  truncatedA,
                  truncatedB,
                },
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
          const results = computePairedTTestResults(pairs);

          return response.ok({
            body: {
              results,
              pairing: {
                totalPairs: pairs.length,
                skippedMissingPairs,
                skippedNullScores,
                truncatedA,
                truncatedB,
              },
            },
          });
        } catch (error) {
          logger.error(
            `Failed to compare evaluation experiments: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          if (error instanceof Error && error.stack) {
            logger.debug(error.stack);
          }
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to compare evaluation experiments' },
          });
        }
      }
    );
};
