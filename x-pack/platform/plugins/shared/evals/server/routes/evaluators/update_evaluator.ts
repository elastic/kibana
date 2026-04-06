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
import { buildCustomEvaluator } from './build_custom_evaluator';
import type { EvaluatorRouteDependencies } from '.';

const EVALS_EVALUATOR_URL = `${EVALS_INTERNAL_URL}/evaluators/{evaluatorId}` as const;

const UpdateEvaluatorRequestParams = z.object({
  evaluatorId: z.string(),
});

const UpdateEvaluatorRequestBody = z.object({
  description: z.string().max(1024).optional(),
  tags: z.record(z.string(), z.string()).optional(),
});

export const registerUpdateEvaluatorRoute = ({
  router,
  logger,
  evaluatorRegistry,
}: EvaluatorRouteDependencies) => {
  router.versioned
    .put({
      path: EVALS_EVALUATOR_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Update a custom evaluator',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateEvaluatorRequestParams),
            body: buildRouteValidationWithZod(UpdateEvaluatorRequestBody),
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
              body: { message: 'Cannot update prebuilt evaluators' },
            });
          }

          const coreContext = await context.core;
          const soClient = coreContext.savedObjects.client;
          const evaluatorClient = new EvaluatorClient(soClient);

          const now = new Date().toISOString();
          const updates: Record<string, unknown> = { updated_at: now };

          if (request.body.description != null) {
            updates.description = request.body.description;
          }
          if (request.body.tags != null) {
            updates.tags = request.body.tags;
          }

          const updatedSo = await evaluatorClient.update(evaluatorId, updates);
          const { name, description, type, config } = updatedSo.attributes;

          const updatedEvaluator = buildCustomEvaluator(
            name,
            description,
            type,
            config as Record<string, unknown>
          );
          evaluatorRegistry.register(updatedEvaluator);

          return response.ok({
            body: {
              name: updatedSo.attributes.name,
              kind: updatedSo.attributes.kind,
              description: updatedSo.attributes.description,
              source: 'custom',
              updated_at: now,
            },
          });
        } catch (error) {
          logger.error(`Failed to update evaluator: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to update evaluator' },
          });
        }
      }
    );
};
