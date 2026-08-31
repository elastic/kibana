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
  CreateEvaluationExperimentRecordRequestBody,
  CreateEvaluationExperimentRecordRequestParams,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { EVALS_API_PRIVILEGES } from '../../../common';
import { ExperimentRecordAlreadyExistsError } from '../../storage/experiments/experiment_record_already_exists_error';
import { findUnauthorizedTargetSpaces } from '../shared/authorize_target_spaces';
import { toExperimentRecordResponse } from './experiment_record_response';
import type { RouteDependencies } from '../register_routes';

export const registerCreateExperimentRecordRoute = ({
  router,
  logger,
  getSpaceId,
  checkManageEvalsPrivileges,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_EXPERIMENT_RECORD_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Create evaluation experiment record',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(CreateEvaluationExperimentRecordRequestParams),
            body: buildRouteValidationWithZod(CreateEvaluationExperimentRecordRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { experimentId } = request.params;
          const explicitSpaceIds = request.body.space_ids;

          if (explicitSpaceIds?.includes(ALL_SPACES_ID)) {
            return response.badRequest({
              body: {
                message: `All spaces ("${ALL_SPACES_ID}") is not a space id; name each space the record belongs to.`,
              },
            });
          }

          const activeSpaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;

          const unauthorizedSpaceIds = await findUnauthorizedTargetSpaces({
            request,
            requestedSpaceIds: explicitSpaceIds,
            activeSpaceId,
            checkManageEvalsPrivileges,
          });

          if (unauthorizedSpaceIds.length > 0) {
            return response.forbidden({
              body: {
                message: `Insufficient privileges to assign the experiment record to space(s): ${unauthorizedSpaceIds.join(
                  ', '
                )}.`,
              },
            });
          }

          const evalsContext = await context.evals;
          const recordClient = evalsContext.experimentRecordService.getClient({
            spaceId: activeSpaceId,
          });

          const { name, description, protocol, provenance, started_at: startedAt } = request.body;

          const record = await recordClient.create({
            experimentId,
            name,
            description,
            protocol,
            provenance,
            startedAt,
            spaceIds: explicitSpaceIds,
          });

          return response.ok({ body: toExperimentRecordResponse(record) });
        } catch (error) {
          if (error instanceof ExperimentRecordAlreadyExistsError) {
            return response.customError({
              statusCode: 409,
              body: { message: error.message },
            });
          }

          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to create experiment record: ${errorMessage}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to create experiment record' },
          });
        }
      }
    );
};
