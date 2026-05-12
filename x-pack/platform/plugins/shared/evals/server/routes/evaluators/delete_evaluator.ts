/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { API_VERSIONS, EVALS_INTERNAL_URL, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import { EvaluatorClient } from '../../storage/evaluator_client';
import type { EvaluatorRouteDependencies } from '.';

const EVALS_EVALUATOR_URL = `${EVALS_INTERNAL_URL}/evaluators/{evaluatorId}` as const;

const DeleteEvaluatorRequestParams = z.object({
  evaluatorId: z.string(),
});

export const registerDeleteEvaluatorRoute = ({
  router,
  logger,
  evaluatorRegistry,
}: EvaluatorRouteDependencies) => {
  router.versioned
    .delete({
      path: EVALS_EVALUATOR_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Delete a custom evaluator',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(DeleteEvaluatorRequestParams),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { evaluatorId } = request.params;
          const evaluator = evaluatorRegistry.get(evaluatorId);

          if (!evaluator) {
            return response.notFound({
              body: { message: `Evaluator not found: ${evaluatorId}` },
            });
          }

          if (evaluator.source !== 'custom') {
            return response.customError({
              statusCode: 400,
              body: { message: 'Cannot delete prebuilt evaluators' },
            });
          }

          const coreContext = await context.core;
          const soClient = coreContext.savedObjects.client;
          const evaluatorClient = new EvaluatorClient(soClient);

          try {
            await evaluatorClient.delete(evaluatorId);
          } catch (deleteError) {
            logger.warn(`Failed to delete evaluator saved object (may not exist): ${deleteError}`);
          }

          evaluatorRegistry.remove(evaluatorId);

          return response.ok({
            body: { success: true },
          });
        } catch (error) {
          logger.error(`Failed to delete evaluator: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to delete evaluator' },
          });
        }
      }
    );
};
