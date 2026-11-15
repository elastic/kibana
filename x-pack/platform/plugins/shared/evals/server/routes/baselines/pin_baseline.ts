/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import {
  EVALS_BASELINES_PIN_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  buildExperimentFilterQuery,
  SCORES_SORT_ORDER,
  PinEvaluationBaselineRequestBody,
} from '@kbn/evals-common';
import type { EvaluationScoreDocument } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { UNBOUNDED_SCORE_FIELDS } from '../utils/score_source_fields';

/**
 * The judge model the run's LLM evaluators scored with: the dominant
 * `evaluator.model.id` across LLM-kind scores (ties broken by count). A baseline is only
 * comparable to runs judged by the same model, so the pointer records it.
 */
const resolveJudgeModelId = (scores: EvaluationScoreDocument[]): string | undefined => {
  const counts = new Map<string, number>();
  for (const score of scores) {
    const modelId = score.evaluator.kind === 'llm' ? score.evaluator.model?.id : undefined;
    if (modelId) {
      counts.set(modelId, (counts.get(modelId) ?? 0) + 1);
    }
  }
  let winner: string | undefined;
  let winnerCount = 0;
  for (const [modelId, count] of counts) {
    if (count > winnerCount) {
      winner = modelId;
      winnerCount = count;
    }
  }
  return winner;
};

export const registerPinBaselineRoute = ({ router, logger, getSpaceId }: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_BASELINES_PIN_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Pin an evaluation execution as regression baseline',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PinEvaluationBaselineRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const {
            suite_id: suiteId,
            execution_id: executionId,
            reason,
            pinned_by: pinnedBy,
          } = request.body;
          const evalsContext = await context.evals;
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

          const searchResponse = await evalsContext.evaluationScoreService.search({
            query: buildExperimentFilterQuery(executionId, {
              suiteId,
              filterField: 'metadata.execution_id',
              spaceId,
            }),
            sort: SCORES_SORT_ORDER,
            size: 10000,
            // The same fields the compare flow reads scores without; keeps the snapshot small.
            _source_excludes: UNBOUNDED_SCORE_FIELDS,
          });

          const hits = searchResponse.hits?.hits ?? [];
          const scores = hits.flatMap((hit) =>
            hit._id != null && hit._source != null
              ? [{ id: hit._id, document: hit._source as unknown as EvaluationScoreDocument }]
              : []
          );

          if (scores.length === 0) {
            return response.notFound({
              body: {
                message: `No scores found for execution "${executionId}" in suite "${suiteId}". The run may not have exported scores yet, or they aged out of retention.`,
              },
            });
          }

          const scoreDocuments = scores.map(({ document }) => document);
          const baseline = await evalsContext.pinnedBaselineService.pin({
            pointer: {
              baseline_id: randomUUID(),
              suite_id: suiteId,
              execution_id: executionId,
              task_model: scoreDocuments[0].task.model,
              judge_model_id: resolveJudgeModelId(scoreDocuments) ?? null,
              git_branch: scoreDocuments[0].metadata?.git?.branch ?? null,
              git_commit_sha: scoreDocuments[0].metadata?.git?.commit_sha ?? null,
              pinned_by: pinnedBy ?? null,
              reason: reason ?? null,
            },
            scores,
            spaceIds: [spaceId],
          });

          return response.ok({ body: { baseline } });
        } catch (error) {
          logger.error(`Failed to pin evaluation baseline: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to pin evaluation baseline' },
          });
        }
      }
    );
};
