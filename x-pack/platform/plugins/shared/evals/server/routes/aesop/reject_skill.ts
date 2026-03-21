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
import {
  SkillNotFoundError,
  SkillAlreadyDeployedError,
  getErrorMessage,
} from '../../lib/aesop/errors/aesop_errors';

const rejectSkillParamsSchema = z.object({
  skillId: z.string().min(1),
});

const rejectSkillBodySchema = z.object({
  review_notes: z.string().min(1),
  rejection_reason: z
    .enum([
      'poor_quality',
      'overlaps_existing',
      'not_useful',
      'security_concern',
      'other',
    ])
    .default('other'),
  suggested_improvements: z.string().optional(),
});

/**
 * POST /internal/aesop/skills/{skillId}/reject
 *
 * Rejects a proposed skill with feedback. Rejected skills:
 * 1. Are marked as rejected in .aesop-proposed-skills
 * 2. Store rejection reason and notes for learning
 * 3. Feed into next exploration cycle (agent learns from feedback)
 * 4. Are NOT deleted (kept for audit trail and pattern analysis)
 *
 * Production features:
 * - Comprehensive error handling
 * - Audit logging
 * - Feedback loop for H3 (approval rate improvement over cycles)
 */
export function registerRejectSkillRoute(router: IRouter<EvalsRequestHandlerContext>) {
  router.versioned
    .post({
      path: '/internal/aesop/skills/{skillId}/reject',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['evals'],
        },
      },
      options: {
        tags: ['access:evals'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(rejectSkillParamsSchema),
            body: buildRouteValidationWithZod(rejectSkillBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const { elasticsearch } = context.core;
        const esClient = elasticsearch.client.asCurrentUser;

        const { skillId } = request.params;
        const { review_notes, rejection_reason, suggested_improvements } = request.body;

        const startTime = Date.now();

        try {
          context.logger.info('[AESOP] Rejecting skill', {
            skill_id: skillId,
            rejection_reason,
            reviewed_by: request.auth.credentials?.username,
          });

          // 1. Load proposed skill
          let skillDoc;
          try {
            skillDoc = await esClient.get({
              index: '.aesop-proposed-skills',
              id: skillId,
            });
          } catch (error) {
            if (getErrorMessage(error).includes('not found')) {
              throw new SkillNotFoundError(skillId);
            }
            throw error;
          }

          const skill = skillDoc._source as any;

          // 2. Validate skill is not already deployed
          if (skill.deployment?.deployed) {
            throw new SkillAlreadyDeployedError(
              skillId,
              skill.deployment.agent_builder_skill_id
            );
          }

          // 3. Update skill document with rejection
          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            body: {
              doc: {
                review: {
                  status: 'rejected',
                  reviewed_by: request.auth.credentials?.username || 'unknown',
                  reviewed_at: new Date().toISOString(),
                  review_notes,
                  rejection_reason,
                  suggested_improvements,
                },
                // Keep validation results for learning
                rejection_metadata: {
                  rejected_at: new Date().toISOString(),
                  validation_score: skill.validation?.final_score,
                  pattern_frequency: skill.source?.pattern_frequency,
                  confidence: skill.confidence,
                },
              },
            },
            refresh: 'wait_for', // Ensure immediately queryable
          });

          // 4. Store rejection feedback for next exploration cycle
          await esClient.index({
            index: '.aesop-rejection-feedback',
            body: {
              skill_id: skillId,
              skill_name: skill.name,
              rejection_reason,
              review_notes,
              suggested_improvements,
              pattern_id: skill.source?.pattern_id,
              pattern_frequency: skill.source?.pattern_frequency,
              confidence: skill.confidence,
              validation_score: skill.validation?.final_score,
              rejected_at: new Date().toISOString(),
              rejected_by: request.auth.credentials?.username || 'unknown',
              // Learning signals for agent
              learning_signals: {
                pattern_frequency_threshold: skill.source?.pattern_frequency < 10 ? 'too_low' : 'acceptable',
                confidence_threshold: skill.confidence < 0.8 ? 'too_low' : 'acceptable',
                validation_score_threshold: skill.validation?.final_score < 0.85 ? 'failed' : 'passed',
              },
            },
            refresh: 'wait_for',
          });

          const durationMs = Date.now() - startTime;

          context.logger.info('[AESOP] Skill rejected successfully', {
            skill_id: skillId,
            rejection_reason,
            duration_ms: durationMs,
          });

          return response.ok({
            body: {
              success: true,
              message: `Skill '${skill.name}' rejected. Feedback will inform next exploration cycle.`,
              skill_id: skillId,
              skill_name: skill.name,
              rejection_reason,
              feedback_stored: true,
            },
          });
        } catch (error) {
          const durationMs = Date.now() - startTime;

          context.logger.error('[AESOP] Failed to reject skill', {
            error: getErrorMessage(error),
            skill_id: skillId,
            duration_ms: durationMs,
          });

          if (error instanceof AESOPError) {
            return response.customError({
              statusCode: error.statusCode,
              body: error.toJSON(),
            });
          }

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to reject skill: ${getErrorMessage(error)}`,
            },
          });
        }
      }
    );
}
