/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  EVALS_EVALUATE_URL,
  EvaluateRequestBody,
  INTERNAL_API_ACCESS,
} from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { EVALS_API_PRIVILEGES } from '../../../common';
import { EvaluationExecutionError } from '../../evaluation/evaluation_execution_error';
import { createEvaluationService } from '../../evaluation/evaluation_service';
import type { RouteDependencies } from '../register_routes';

export const registerEvaluateRoute = ({
  router,
  logger,
  evaluatorRegistry,
  getInferenceStart,
  getSpaceId,
}: RouteDependencies) => {
  const evaluationService = createEvaluationService({
    evaluatorRegistry,
    logger,
    getInferenceStart,
  });

  router.versioned
    .post({
      path: EVALS_EVALUATE_URL,
      access: INTERNAL_API_ACCESS,
      enableQueryVersion: true,
      security: {
        authz: { requiredPrivileges: [EVALS_API_PRIVILEGES.manage] },
      },
      summary: 'Evaluate trace with one or more evaluators',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(EvaluateRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { subject, evaluators } = request.body;
        const spaceId = getSpaceId ? await getSpaceId(request) : DEFAULT_SPACE_ID;
        const coreContext = await context.core;
        try {
          const results = await evaluationService.evaluate({
            request,
            spaceId,
            subject,
            evaluators,
            // Unchanged from before this route was refactored: experiment runs reach here
            // through a workflow's fake request, so scoping the read to the caller needs
            // its own change. Only persisted evaluators run here, so the prompt is not
            // caller-controlled the way it is on `_test`.
            traceReader: coreContext.elasticsearch.client.asInternalUser,
          });

          return response.ok({ body: { results } });
        } catch (error) {
          if (error instanceof EvaluationExecutionError) {
            return response[error.responseType]({ body: { message: error.message } });
          }
          throw error;
        }
      }
    );
};
