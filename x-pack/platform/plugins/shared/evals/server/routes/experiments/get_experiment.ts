/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVALS_EXPERIMENT_URL,
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  buildExperimentFilterQuery,
  buildStatsAggregation,
  parseStatsAggregationResponse,
  buildModelDisplayId,
  GetEvaluationExperimentRequestParams,
  GetEvaluationExperimentRequestQuery,
} from '@kbn/evals-common';
import type { EvaluatorStats } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';

type EvaluatorModel = NonNullable<EvaluatorStats['evaluator_model']>;

const MAX_EVALUATOR_MODELS = 20;

interface EvalDocSource {
  experiment_name?: string;
  task?: { model?: { id?: string; family?: string; provider?: string } };
  metadata?: {
    execution_id?: string;
    suite_id?: string;
    total_repetitions?: number;
    git?: {
      branch?: string | null;
      commit_sha?: string | null;
    };
    ci?: {
      build_url?: string;
      pull_request?: string;
      pipeline_slug?: string;
      build_id?: string;
      job_id?: string;
      branch?: string;
      commit?: string;
    };
  };
  '@timestamp'?: string;
}

export const registerGetExperimentRoute = ({ router, logger, getSpaceId }: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXPERIMENT_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get evaluation experiment detail',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetEvaluationExperimentRequestParams),
            query: buildRouteValidationWithZod(GetEvaluationExperimentRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { experimentId } = request.params;
          const { suite_id: suiteId, model_id: modelId, execution_id: executionId } = request.query;
          const evalsContext = await context.evals;
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

          const filterId = executionId ?? experimentId;
          const filterField = executionId ? 'metadata.execution_id' : 'experiment_id';
          const query = buildExperimentFilterQuery(filterId, {
            suiteId,
            modelId,
            filterField,
            spaceId,
          });

          const metadataResponse = await evalsContext.evaluationScoreService.search({
            query,
            size: 1,
          });

          const firstHit = metadataResponse.hits?.hits[0];
          const firstDoc = firstHit?._source as EvalDocSource | undefined;
          if (!firstDoc) {
            return response.notFound({
              body: { message: `Experiment not found: ${experimentId}` },
            });
          }

          const aggResponse = await evalsContext.evaluationScoreService.search({
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

          // Evaluators can each judge with their own model, so this summary comes from the
          // per-evaluator stats: every distinct judge, most used first, ties broken by id to keep
          // the answer stable, and nothing at all when only code evaluators ran. Reading it off
          // `firstDoc` instead would report whichever judge the unsorted search happened to hit.
          // Evaluators are counted once each, since stats carry a row per dataset an evaluator
          // ran on and a judge should not gain weight from running on more datasets.
          const evaluatorNamesPerModel = new Map<
            string,
            { model: EvaluatorModel; evaluatorNames: Set<string> }
          >();
          for (const { evaluator_model: model, evaluator_name: evaluatorName } of stats) {
            if (!model?.id) continue;
            const entry = evaluatorNamesPerModel.get(model.id);
            if (entry) {
              entry.evaluatorNames.add(evaluatorName);
            } else {
              evaluatorNamesPerModel.set(model.id, {
                model,
                evaluatorNames: new Set([evaluatorName]),
              });
            }
          }
          const evaluatorModels = [...evaluatorNamesPerModel.values()]
            .sort(
              (a, b) =>
                b.evaluatorNames.size - a.evaluatorNames.size ||
                a.model.id.localeCompare(b.model.id)
            )
            .map(({ model }) => model)
            // Kept in step with the response schema's maxItems, which the SDK client enforces
            // when it parses this response. No realistic experiment reaches it.
            .slice(0, MAX_EVALUATOR_MODELS);

          return response.ok({
            body: {
              experiment_id: experimentId,
              experiment_name: firstDoc.experiment_name ?? null,
              execution_id: firstDoc.metadata?.execution_id,
              suite_id: firstDoc.metadata?.suite_id ?? null,
              timestamp: firstDoc['@timestamp'],
              task_model: toModelDisplay(firstDoc.task?.model),
              evaluator_model: evaluatorModels[0],
              evaluator_models: evaluatorModels,
              git_branch: firstDoc.metadata?.git?.branch ?? null,
              git_commit_sha: firstDoc.metadata?.git?.commit_sha ?? null,
              ci: firstDoc.metadata?.ci,
              total_repetitions: firstDoc.metadata?.total_repetitions ?? 1,
              stats,
            },
          });
        } catch (error) {
          logger.error(`Failed to get evaluation experiment: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get evaluation experiment' },
          });
        }
      }
    );
};
