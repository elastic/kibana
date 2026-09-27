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
  GetEvaluationExperimentExampleDetailsRequestParams,
  GetEvaluationExperimentExampleDetailsRequestQuery,
  buildDatasetExampleScoresQuery,
  type GetEvaluationExperimentExampleDetailsResponse,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { handleMaximumResponseSizeExceededError } from '../utils/handle_response_size_error';
import { EXAMPLE_REPETITION_PAYLOAD_SORT } from './preview_source_script';

const DETAILS_SOURCE_FIELDS = ['example.input', 'task.output'] as const;

interface DetailsSource {
  example?: {
    input?: Record<string, unknown> | null;
  };
  task?: {
    output?: Record<string, unknown> | null;
  };
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
          const detailsResponse = await evalsContext.evaluationScoreService.search({
            query: buildExampleRepetitionQuery({
              datasetId,
              filterId,
              filterField,
              spaceId,
              exampleId,
              repetitionIndex,
            }),
            size: 1,
            sort: EXAMPLE_REPETITION_PAYLOAD_SORT,
            _source_includes: [...DETAILS_SOURCE_FIELDS],
            track_total_hits: false,
          });
          const hit = detailsResponse.hits?.hits[0];

          if (!hit) {
            return response.notFound({
              body: {
                message: `Example repetition not found: ${exampleId}/${repetitionIndex}`,
              },
            });
          }

          const details = (hit._source ?? {}) as DetailsSource;

          const body: GetEvaluationExperimentExampleDetailsResponse = {
            example: {
              input: details.example?.input ?? null,
            },
            task: {
              output: details.task?.output ?? null,
            },
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
