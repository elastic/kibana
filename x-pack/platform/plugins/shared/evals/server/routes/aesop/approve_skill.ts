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
import { sanitizeSkillMarkdown } from '../../lib/aesop/security/input_sanitization';

const approveSkillParamsSchema = z.object({
  skillId: z.string(),
});

const approveSkillBodySchema = z.object({
  review_notes: z.string().optional(),
});

export function registerApproveSkillRoute(router: IRouter<EvalsRequestHandlerContext>) {
  router.versioned
    .post({
      path: '/internal/aesop/skills/{skillId}/approve',
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
            params: buildRouteValidationWithZod(approveSkillParamsSchema),
            body: buildRouteValidationWithZod(approveSkillBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const { elasticsearch, savedObjects } = context.core;
        const { agentBuilder } = context;
        const esClient = elasticsearch.client.asCurrentUser;

        const { skillId } = request.params;
        const { review_notes } = request.body;

        try {
          // Rate limiting check
          const rateLimiter = new RateLimiterService(DEFAULT_RATE_LIMITS, context.logger);
          const userId = request.auth.credentials?.username || 'anonymous';
          const rateLimit = await rateLimiter.checkRateLimit(userId, 'approval');

          if (!rateLimit.allowed) {
            return response.customError({
              statusCode: 429,
              body: {
                message: `Rate limit exceeded. You can approve 20 skills per hour. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
              },
              headers: {
                'Retry-After': rateLimit.retryAfterSeconds!.toString(),
                'X-RateLimit-Limit': rateLimit.limit.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': new Date(rateLimit.resetAt!).toISOString(),
              },
            });
          }
          // 1. Load proposed skill
          const skillDoc = await esClient.get({
            index: '.aesop-proposed-skills',
            id: skillId,
          });

          const skill = skillDoc._source as any;

          // 2. Sanitize skill markdown before deployment
          const sanitizedMarkdown = sanitizeSkillMarkdown(skill.markdown);

          // 3. Validate skill passed evaluations
          if (skill.validation?.status !== 'passed') {
            return response.badRequest({
              body: {
                message: `Skill must pass validation before approval. Current status: ${skill.validation?.status || 'pending'}`,
              },
            });
          }

          // 4. Deploy skill to Agent Builder
          context.logger.info('[AESOP] Deploying skill to Agent Builder', {
            skill_id: skillId,
            user_id: userId,
            rate_limit_remaining: rateLimit.remaining,
          });

          const agentBuilderClient = await agentBuilder.getClient(request);

          const createdSkill = await agentBuilderClient.createSkill({
            name: skill.name,
            description: skill.description,
            content: sanitizedMarkdown,
            tools: skill.tools || [],
            labels: ['aesop-generated', 'auto-discovered'],
            metadata: {
              source: 'aesop',
              aesop_skill_id: skillId,
              discovery_trace_id: skill.metadata.discovery_trace_id,
              eval_score: skill.validation.final_score,
              pattern_frequency: skill.source.pattern_frequency,
              approved_at: new Date().toISOString(),
            },
          });

          context.logger.info('[AESOP] Skill deployed to Agent Builder', {
            aesop_skill_id: skillId,
            agent_builder_skill_id: createdSkill.id,
          });

          // 5. Update proposed skill document
          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            body: {
              doc: {
                review: {
                  status: 'approved',
                  reviewed_by: request.auth.credentials?.username || 'unknown',
                  reviewed_at: new Date().toISOString(),
                  review_notes,
                },
                deployment: {
                  deployed: true,
                  agent_builder_skill_id: createdSkill.id,
                  deployed_at: new Date().toISOString(),
                },
              },
            },
          });

          return response.ok({
            body: {
              success: true,
              message: 'Skill approved and deployed to Agent Builder',
              agent_builder_skill_id: createdSkill.id,
            },
          });
        } catch (error) {
          context.logger.error('[AESOP] Failed to approve skill', { error, skill_id: skillId });

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to approve skill: ${error.message}`,
            },
          });
        }
      }
    );
}
