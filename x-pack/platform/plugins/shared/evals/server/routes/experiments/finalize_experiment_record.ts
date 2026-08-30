/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_EXPERIMENT_RECORD_FINALIZE_URL,
  INTERNAL_API_ACCESS,
  FinalizeEvaluationExperimentRecordRequestBody,
  FinalizeEvaluationExperimentRecordRequestParams,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import { ExperimentRecordNotFoundError } from '../../storage/experiments/experiment_record_not_found_error';
import { toExperimentRecordResponse } from './experiment_record_response';
import type { RouteDependencies } from '../register_routes';

export const registerFinalizeExperimentRecordRoute = ({
  router,
  logger,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_EXPERIMENT_RECORD_FINALIZE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Finalize evaluation experiment record',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(FinalizeEvaluationExperimentRecordRequestParams),
            body: buildRouteValidationWithZod(FinalizeEvaluationExperimentRecordRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { experimentId } = request.params;
          const activeSpaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

          const evalsContext = await context.evals;
          const recordClient = evalsContext.experimentRecordService.getClient({
            spaceId: activeSpaceId,
          });

          const { status, completeness, error: runError, completed_at: completedAt } = request.body;

          const record = await recordClient.update(experimentId, {
            status,
            completeness,
            error: runError,
            completedAt,
          });

          return response.ok({ body: toExperimentRecordResponse(record) });
        } catch (error) {
          if (error instanceof ExperimentRecordNotFoundError) {
            return response.notFound({
              body: { message: error.message },
            });
          }

          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to finalize experiment record: ${errorMessage}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to finalize experiment record' },
          });
        }
      }
    );
};
