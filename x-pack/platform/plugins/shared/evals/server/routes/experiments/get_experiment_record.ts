/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_EXPERIMENT_RECORD_URL,
  INTERNAL_API_ACCESS,
  GetEvaluationExperimentRecordRequestParams,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import { toExperimentRecordResponse } from './experiment_record_response';
import type { RouteDependencies } from '../register_routes';

export const registerGetExperimentRecordRoute = ({
  router,
  logger,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_EXPERIMENT_RECORD_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.read] },
      },
      summary: 'Get evaluation experiment record',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetEvaluationExperimentRecordRequestParams),
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

          const record = await recordClient.get(experimentId);
          if (!record) {
            return response.notFound({
              body: { message: `Experiment record for experiment "${experimentId}" was not found` },
            });
          }

          return response.ok({ body: toExperimentRecordResponse(record) });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to get experiment record: ${errorMessage}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get experiment record' },
          });
        }
      }
    );
};
