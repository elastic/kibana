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
import type { EvaluationRouteDependencies } from '.';

const EVALS_EVALUATE_URL = `${EVALS_INTERNAL_URL}/evaluate` as const;

const EvaluateRequestBody = z.object({
  items: z.array(
    z.object({
      input: z.record(z.string(), z.unknown()),
      output: z.unknown(),
      expected: z.unknown().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
  ),
  evaluator_names: z.array(z.string()).min(1),
  connector_id: z.string(),
  concurrency: z.number().min(1).max(50).optional(),
  persist: z.boolean().optional(),
  dataset_id: z.string().optional(),
  required_pass: z.array(z.string()).optional(),
});

export const registerEvaluateRoute = ({
  router,
  logger,
  evaluatorRegistry,
}: EvaluationRouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_EVALUATE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Run evaluation on items',
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
      async (_context, request, response) => {
        try {
          const {
            items,
            evaluator_names: evaluatorNames,
            connector_id: connectorId,
            concurrency,
            persist,
            dataset_id: datasetId,
            required_pass: requiredPass,
          } = request.body;

          const { createEvaluationRunner } = await import(
            '../../lib/evaluation_engine/evaluation_runner'
          );

          const runner = createEvaluationRunner(evaluatorRegistry, logger);
          const result = await runner.run({
            items,
            evaluatorNames,
            connectorId,
            concurrency,
            persist,
            datasetId,
            requiredPass,
          });

          return response.ok({ body: result });
        } catch (error) {
          if (error instanceof Error && error.message.startsWith('Evaluator not found:')) {
            return response.customError({
              statusCode: 400,
              body: { message: error.message },
            });
          }

          logger.error(`Failed to run evaluation: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to run evaluation' },
          });
        }
      }
    );
};
