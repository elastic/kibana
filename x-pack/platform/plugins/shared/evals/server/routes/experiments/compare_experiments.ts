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
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
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
  'evaluator.direction',
  'task.repetition_index',
];

export const registerCompareExperimentsRoute = ({
  router,
  logger,
  getSpaceId,
}: RouteDependencies) => {
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
          const { type, baseline_id: idBaseline, target_id: idTarget } = request.query;

          if (idBaseline === idTarget) {
            return response.badRequest({
              body: {
                message: `baseline_id and target_id must differ; cannot compare an ${type} with itself.`,
              },
            });
          }

          const filterField = type === 'execution' ? 'metadata.execution_id' : 'experiment_id';

          const evalsContext = await context.evals;
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

          const [responseBaseline, responseTarget] = await Promise.all([
            evalsContext.evaluationScoreService.search({
              query: buildExperimentFilterQuery(idBaseline, { filterField, spaceId }),
              sort: SCORES_SORT_ORDER,
              size: MAX_SCORES_PER_EXPERIMENT,
              _source: COMPARE_SOURCE_FIELDS,
              track_total_hits: true,
            }),
            evalsContext.evaluationScoreService.search({
              query: buildExperimentFilterQuery(idTarget, { filterField, spaceId }),
              sort: SCORES_SORT_ORDER,
              size: MAX_SCORES_PER_EXPERIMENT,
              _source: COMPARE_SOURCE_FIELDS,
              track_total_hits: true,
            }),
          ]);

          const totalHitsBaseline =
            typeof responseBaseline.hits.total === 'number'
              ? responseBaseline.hits.total
              : responseBaseline.hits.total?.value ?? 0;
          const totalHitsTarget =
            typeof responseTarget.hits.total === 'number'
              ? responseTarget.hits.total
              : responseTarget.hits.total?.value ?? 0;
          const truncatedBaseline = totalHitsBaseline > MAX_SCORES_PER_EXPERIMENT;
          const truncatedTarget = totalHitsTarget > MAX_SCORES_PER_EXPERIMENT;

          if (truncatedBaseline || truncatedTarget) {
            logger.warn(
              `Compare experiments: results truncated to ${MAX_SCORES_PER_EXPERIMENT} scores per experiment. ` +
                `Baseline (${idBaseline}): ${totalHitsBaseline} total, target (${idTarget}): ${totalHitsTarget} total.`
            );
          }

          const scoresBaseline = (responseBaseline.hits?.hits ?? [])
            .map((hit) => hit._source as EvaluationScoreDocument | undefined)
            .filter((source): source is EvaluationScoreDocument => source !== undefined);

          const scoresTarget = (responseTarget.hits?.hits ?? [])
            .map((hit) => hit._source as EvaluationScoreDocument | undefined)
            .filter((source): source is EvaluationScoreDocument => source !== undefined);

          if (scoresBaseline.length === 0) {
            return response.notFound({
              body: { message: `No scores found for ${filterField}: ${idBaseline}` },
            });
          }
          if (scoresTarget.length === 0) {
            return response.notFound({
              body: { message: `No scores found for ${filterField}: ${idTarget}` },
            });
          }

          const datasetsBaseline = new Set(scoresBaseline.map((s) => s.example.dataset.id));
          const datasetsTarget = new Set(scoresTarget.map((s) => s.example.dataset.id));
          const overlapping = [...datasetsBaseline].filter((id) => datasetsTarget.has(id));

          if (overlapping.length === 0) {
            return response.ok({
              body: {
                results: [],
                pairing: {
                  totalPairs: 0,
                  skippedMissingPairs: 0,
                  skippedNullScores: 0,
                  truncatedBaseline,
                  truncatedTarget,
                },
              },
            });
          }

          const overlappingSet = new Set(overlapping);
          const filteredBaseline = scoresBaseline.filter((s) =>
            overlappingSet.has(s.example.dataset.id)
          );
          const filteredTarget = scoresTarget.filter((s) =>
            overlappingSet.has(s.example.dataset.id)
          );

          const { pairs, skippedMissingPairs, skippedNullScores } = pairScores(
            filteredTarget,
            filteredBaseline
          );
          const results = computePairedTTestResults(pairs);

          return response.ok({
            body: {
              results,
              pairing: {
                totalPairs: pairs.length,
                skippedMissingPairs,
                skippedNullScores,
                truncatedBaseline,
                truncatedTarget,
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
