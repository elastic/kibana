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

const EVALS_DEPLOYMENT_GATES_URL = `${EVALS_INTERNAL_URL}/config/deployment-gates` as const;

const DeploymentGatesRequestBody = z.object({
  composite_threshold: z.number().min(0).max(1),
  per_evaluator: z.record(z.string(), z.object({ min: z.number().min(0).max(1) })),
  required_pass: z.array(z.string()),
  min_repetitions: z.number().min(1).max(100),
});

export const registerDeploymentGatesRoute = ({ router, logger }: EvaluationRouteDependencies) => {
  // GET — read current deployment gates config
  router.versioned
    .get({
      path: EVALS_DEPLOYMENT_GATES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Get deployment gates configuration',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {},
      },
      async (_context, _request, response) => {
        try {
          // Stub: deployment gates configuration will be read from a saved object
          // once the SO type is registered (Phase 7). Return defaults for now.
          return response.ok({
            body: {
              composite_threshold: 0.7,
              per_evaluator: {},
              required_pass: [],
              min_repetitions: 1,
              created_at: new Date().toISOString(),
            },
          });
        } catch (error) {
          logger.error(`Failed to read deployment gates: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to read deployment gates' },
          });
        }
      }
    );

  // POST — configure deployment gates
  router.versioned
    .post({
      path: EVALS_DEPLOYMENT_GATES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Configure deployment gates',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(DeploymentGatesRequestBody),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const {
            composite_threshold: compositeThreshold,
            per_evaluator: perEvaluator,
            required_pass: requiredPass,
            min_repetitions: minRepetitions,
          } = request.body;

          // Stub: deployment gates configuration will be persisted as a saved object
          // once the SO type is registered (Phase 7).
          return response.ok({
            body: {
              composite_threshold: compositeThreshold,
              per_evaluator: perEvaluator,
              required_pass: requiredPass,
              min_repetitions: minRepetitions,
              created_at: new Date().toISOString(),
            },
          });
        } catch (error) {
          logger.error(`Failed to configure deployment gates: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to configure deployment gates' },
          });
        }
      }
    );
};
