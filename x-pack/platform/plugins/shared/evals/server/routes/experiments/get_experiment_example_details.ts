/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_EXPERIMENT_EXAMPLE_DETAILS_URL,
  INTERNAL_API_ACCESS,
  MAX_SCORES_PER_QUERY,
  GetEvaluationExperimentExampleDetailsRequestParams,
  GetEvaluationExperimentExampleDetailsRequestQuery,
  buildDatasetExampleScoresQuery,
  type EvaluatorInfo,
  type GetEvaluationExperimentExampleDetailsResponse,
  type Model,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { handleMaximumResponseSizeExceededError } from '../utils/handle_response_size_error';

const SHARED_SOURCE_FIELDS = [
  'example.id',
  'example.index',
  'example.input',
  'example.metadata',
  'task.repetition_index',
  'task.output',
  'task.model',
  'task.trace_id',
] as const;

interface SharedDetailsSource {
  example?: {
    id?: string;
    index?: number;
    input?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  };
  task?: {
    repetition_index?: number;
    output?: Record<string, unknown> | null;
    model?: Model;
    trace_id?: string | null;
  };
}

interface EvaluatorDetailsSource {
  evaluator?: EvaluatorInfo;
}

const buildExampleRepetitionQuery = ({
  datasetId,
  filterId,
  filterField,
  spaceId,
  exampleId,
  repetitionIndex,
}: {
  datasetId: string;
  filterId: string;
  filterField: 'experiment_id' | 'metadata.execution_id';
  spaceId: string;
  exampleId: string;
  repetitionIndex: number;
}) => {
  const query = buildDatasetExampleScoresQuery(datasetId, filterId, { filterField, spaceId });
  query.bool.must.push(
    { term: { 'example.id': exampleId } },
    { term: { 'task.repetition_index': repetitionIndex } }
  );
  return query;
};

export const registerGetExperimentExampleDetailsRoute = ({
  router,
  logger,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXPERIMENT_EXAMPLE_DETAILS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get evaluation experiment example details',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(
              GetEvaluationExperimentExampleDetailsRequestParams.extend({
                repetitionIndex: z.coerce.number().int().min(0),
              })
            ),
            query: buildRouteValidationWithZod(GetEvaluationExperimentExampleDetailsRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { experimentId, datasetId, exampleId, repetitionIndex } = request.params;
          const { execution_id: executionId } = request.query;
          const evalsContext = await context.evals;
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;
          const filterId = executionId ?? experimentId;
          const filterField = executionId ? 'metadata.execution_id' : 'experiment_id';
          const queryOptions = {
            datasetId,
            filterId,
            filterField,
            spaceId,
            exampleId,
            repetitionIndex,
          } as const;

          const sharedDetailsResponse = await evalsContext.evaluationScoreService.search({
            query: buildExampleRepetitionQuery(queryOptions),
            size: 1,
            _source_includes: [...SHARED_SOURCE_FIELDS],
            track_total_hits: false,
          });
          const sharedDetails = sharedDetailsResponse.hits?.hits[0]?._source as
            | SharedDetailsSource
            | undefined;

          if (!sharedDetails) {
            return response.notFound({
              body: {
                message: `Example repetition not found: ${exampleId}/${repetitionIndex}`,
              },
            });
          }

          const model = sharedDetails.task?.model;
          if (!model) {
            throw new Error('Example repetition score is missing its task model');
          }

          const evaluatorDetailsResponse = await evalsContext.evaluationScoreService.search({
            query: buildExampleRepetitionQuery(queryOptions),
            size: MAX_SCORES_PER_QUERY,
            _source_includes: ['evaluator'],
            sort: [{ 'evaluator.name': { order: 'asc' } }, { _shard_doc: { order: 'asc' } }],
            track_total_hits: false,
          });
          const evaluators = (evaluatorDetailsResponse.hits?.hits ?? [])
            .map((hit) => (hit._source as EvaluatorDetailsSource | undefined)?.evaluator)
            .filter((evaluator): evaluator is EvaluatorInfo => evaluator !== undefined);

          const body: GetEvaluationExperimentExampleDetailsResponse = {
            example: {
              id: sharedDetails.example?.id ?? exampleId,
              index: sharedDetails.example?.index ?? null,
              input: sharedDetails.example?.input ?? null,
              metadata: sharedDetails.example?.metadata ?? null,
            },
            task: {
              repetition_index: sharedDetails.task?.repetition_index ?? repetitionIndex,
              output: sharedDetails.task?.output ?? null,
              model,
              trace_id: sharedDetails.task?.trace_id ?? null,
            },
            evaluators,
          };

          return response.ok({ body });
        } catch (error) {
          const tooLarge = handleMaximumResponseSizeExceededError({
            error,
            response,
            logger,
            context: 'Get experiment example details',
          });
          if (tooLarge) return tooLarge;

          logger.error(`Failed to get experiment example details: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get experiment example details' },
          });
        }
      }
    );
};
