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
import type { EvaluatorRouteDependencies } from '.';

const EVALS_EVALUATORS_TEST_URL = `${EVALS_INTERNAL_URL}/evaluators/test` as const;

const TestEvaluatorRequestBody = z.object({
  evaluator_name: z.string(),
  input: z.record(z.string(), z.unknown()),
  output: z.unknown(),
  expected: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const registerTestEvaluatorRoute = ({
  router,
  logger,
  evaluatorRegistry,
}: EvaluatorRouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_EVALUATORS_TEST_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Test an evaluator against sample input/output',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(TestEvaluatorRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { evaluator_name: evaluatorName, input, output, expected, metadata } = request.body;

          const evaluator = evaluatorRegistry.get(evaluatorName);
          if (!evaluator) {
            return response.customError({
              statusCode: 400,
              body: { message: `Evaluator not found: ${evaluatorName}` },
            });
          }

          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const startTime = Date.now();
          const result = await evaluator.evaluate({
            input,
            output,
            expected,
            metadata,
            esClient,
          });
          const durationMs = Date.now() - startTime;

          return response.ok({
            body: {
              result,
              duration_ms: durationMs,
            },
          });
        } catch (error) {
          logger.error(`Failed to test evaluator: ${error}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: error instanceof Error ? error.message : 'Failed to test evaluator',
            },
          });
        }
      }
    );
};
