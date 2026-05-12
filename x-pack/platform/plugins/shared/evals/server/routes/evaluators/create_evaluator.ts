/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { API_VERSIONS, EVALS_INTERNAL_URL, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import { EvaluatorClient } from '../../storage/evaluator_client';
import type { EvaluatorRouteDependencies } from '.';
import { buildCustomEvaluator } from './build_custom_evaluator';

const EVALS_EVALUATORS_CUSTOM_URL = `${EVALS_INTERNAL_URL}/evaluators/custom` as const;

const LlmJudgeConfigSchema = z.object({
  prompt_template: z.string().min(1),
  scoring_mode: z.enum(['boolean', 'continuous', 'rubric']),
  feedback_key: z.string(),
  rubric_levels: z
    .array(
      z.object({
        label: z.string(),
        score: z.number(),
        description: z.string(),
      })
    )
    .optional(),
});

const CodeConfigSchema = z.object({
  function_body: z.string().min(1),
});

const EsqlConfigSchema = z.object({
  query_template: z.string().min(1),
  score_expression: z.string(),
  pass_condition: z.string(),
});

const CreateEvaluatorRequestBody = z.object({
  name: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
      message:
        'Name must be lowercase alphanumeric with hyphens, starting and ending with alphanumeric',
    }),
  description: z.string().max(1024),
  type: z.enum(['llm-judge', 'code', 'esql']),
  config: z.union([LlmJudgeConfigSchema, CodeConfigSchema, EsqlConfigSchema]),
  tags: z.record(z.string(), z.string()).optional(),
  shared: z.boolean().optional(),
});

export const registerCreateEvaluatorRoute = ({
  router,
  logger,
  evaluatorRegistry,
}: EvaluatorRouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_EVALUATORS_CUSTOM_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Create a custom evaluator',
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
        try {
          const { name, description, type, config, tags, shared } = request.body;

          if (evaluatorRegistry.has(name)) {
            return response.customError({
              statusCode: 409,
              body: { message: `Evaluator "${name}" already exists` },
            });
          }

          const now = new Date().toISOString();
          const evaluator = buildCustomEvaluator(
            name,
            description,
            type,
            config as Record<string, unknown>
          );

          const coreContext = await context.core;
          const soClient = coreContext.savedObjects.client;
          const evaluatorClient = new EvaluatorClient(soClient);

          // Only llm-judge type uses LLM kind; code and esql are both CODE
          const kind = type === 'llm-judge' ? 'LLM' : 'CODE';
          try {
            await evaluatorClient.create({
              name,
              kind,
              type,
              description,
              config: config as Record<string, unknown>,
              version: 1,
              tags: tags ?? {},
              shared: shared ?? false,
              created_at: now,
              updated_at: now,
            });
          } catch (error) {
            if (SavedObjectsErrorHelpers.isConflictError(error)) {
              return response.conflict({
                body: { message: `Evaluator "${name}" already exists` },
              });
            }
            throw error;
          }

          evaluatorRegistry.register(evaluator);

          return response.ok({
            body: {
              name,
              kind: evaluator.kind,
              type,
              description,
              source: 'custom',
              version: 1,
              tags: tags ?? {},
              shared: shared ?? false,
              created_at: now,
            },
          });
        } catch (error) {
          logger.error(`Failed to create evaluator: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to create evaluator' },
          });
        }
      }
    );
};
