/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  CreateEvaluatorRequestBody,
  EVALS_EVALUATORS_URL,
  INTERNAL_API_ACCESS,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import type { RouteDependencies } from '../register_routes';
import { handleEvaluatorError } from './shared/handle_evaluator_error';
import { toPersistedEvaluatorResponse } from './shared/to_persisted_evaluator';

export const registerCreateEvaluatorRoute = ({
  router,
  logger,
  getSpaceId,
  getCurrentUsername,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_EVALUATORS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Create evaluator',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateEvaluatorRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { name, description, judge } = request.body;

        try {
          const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;
          const createdBy = await getCurrentUsername?.(request);
          const { evaluatorDefinitionService } = await context.evals;

          const evaluator = await evaluatorDefinitionService
            .getClient({ spaceId })
            .create({ name, description, judge, createdBy });

          return response.ok({ body: { evaluator: toPersistedEvaluatorResponse(evaluator) } });
        } catch (error) {
          return handleEvaluatorError({
            error,
            response,
            logger,
            fallbackMessage: 'Failed to create evaluator',
          });
        }
      }
    );
};
