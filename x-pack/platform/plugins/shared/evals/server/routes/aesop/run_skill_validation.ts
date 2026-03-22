/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { IRouter } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { EvalsRequestHandlerContext } from '../../types';
import { RateLimiterService, DEFAULT_RATE_LIMITS } from '../../lib/aesop/security/rate_limiter';

const runSkillValidationParamsSchema = z.object({
  skillId: z.string(),
});

const runSkillValidationBodySchema = z.object({
  connector_id: z.string(),
  evaluation_connector_id: z.string().optional(),
  convergence_threshold: z.number().min(0).max(1).default(0.85),
  max_iterations: z.number().int().min(1).max(10).default(5),
});

export function registerRunSkillValidationRoute(router: IRouter<EvalsRequestHandlerContext>) {
  router.versioned
    .post({
      path: '/internal/aesop/skills/{skillId}/validate',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['evals'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(runSkillValidationParamsSchema),
            body: buildRouteValidationWithZod(runSkillValidationBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const { workflowsManagement, elasticsearch } = context;
        const esClient = elasticsearch.client.asCurrentUser;

        const { skillId } = request.params;
        const { connector_id, evaluation_connector_id, convergence_threshold, max_iterations } = request.body;

        if (!workflowsManagement) {
          return response.badRequest({
            body: { message: 'Workflows Management plugin not available' },
          });
        }

        try {
          // Rate limiting check
          const rateLimiter = new RateLimiterService(DEFAULT_RATE_LIMITS, context.logger);
          const userId = request.auth.credentials?.username || 'anonymous';
          const rateLimit = await rateLimiter.checkRateLimit(userId, 'validation');

          if (!rateLimit.allowed) {
            return response.customError({
              statusCode: 429,
              body: {
                message: `Rate limit exceeded. You can run 10 validations per hour. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
              },
              headers: {
                'Retry-After': rateLimit.retryAfterSeconds!.toString(),
                'X-RateLimit-Limit': rateLimit.limit.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(rateLimit.resetAt!).toISOString(),
              },
            });
          }
          // 1. Load skill
          const skillDoc = await esClient.get({
            index: '.aesop-proposed-skills',
            id: skillId,
          });

          const skill = skillDoc._source as any;

          context.logger.info('[AESOP] Starting skill validation', {
            skill_id: skillId,
            skill_name: skill.name,
            convergence_threshold,
            max_iterations,
            user_id: userId,
            rate_limit_remaining: rateLimit.remaining,
          });

          // 2. Update skill status to "validating"
          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            body: {
              doc: {
                validation: {
                  status: 'validating',
                  started_at: new Date().toISOString(),
                },
              },
            },
          });

          // 3. Execute validation workflow
          const workflowApi = workflowsManagement.management;
          const executionId = await workflowApi.runWorkflow(
            {
              id: 'aesop.skill_validation',
              name: 'AESOP Skill Validation',
              enabled: true,
              definition: {},
              yaml: '',
            },
            'default',
            {
              skill_id: skillId,
              connector_id,
              evaluation_connector_id: evaluation_connector_id || connector_id,
              convergence_threshold,
              max_iterations,
            },
            request
          );

          context.logger.info('[AESOP] Validation workflow started', {
            execution_id: executionId,
            skill_id: skillId,
          });

          return response.ok({
            body: {
              success: true,
              execution_id: executionId,
              skill_id: skillId,
              skill_name: skill.name,
              status: 'validating',
              message: `Validation started for skill: ${skill.name}`,
            },
          });
        } catch (error) {
          context.logger.error('[AESOP] Failed to start validation', { error, skill_id: skillId });

          // Revert skill status
          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            body: {
              doc: {
                validation: {
                  status: 'pending',
                },
              },
            },
          }).catch(() => {}); // Ignore update errors

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to start validation: ${error.message}`,
            },
          });
        }
      }
    );
}
