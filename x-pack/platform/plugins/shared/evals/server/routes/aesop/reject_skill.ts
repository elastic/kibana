/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AESOPRouteDependencies } from './register_aesop_routes';
import type { ProposedSkillDocument } from '../../lib/aesop/types';
import {
  AESOPError,
  SkillNotFoundError,
  SkillAlreadyDeployedError,
  getErrorMessage,
} from '../../lib/aesop/errors/aesop_errors';
import {
  buildLlmRequestBody,
  extractLlmResponseText,
  getConnectorTypeId,
} from '../../lib/aesop/llm_defaults';

type ActionsClient = Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>;

interface EsErrorLike {
  meta?: { statusCode?: number };
}

const rejectSkillParamsSchema = z.object({
  skillId: z.string().min(1),
});

const rejectSkillBodySchema = z.object({
  review_notes: z.string().optional().default(''),
  rejection_reason: z
    .enum([
      'poor_quality',
      'overlaps_existing',
      'not_useful',
      'security_concern',
      'invalid_index_reference',
      'other',
    ])
    .optional()
    .default('other'),
  suggested_improvements: z.string().optional(),
  connector_id: z.string().optional(),
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
export function registerRejectSkillRoute({ router, logger }: AESOPRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/aesop/skills/{skillId}/reject',
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
            params: buildRouteValidationWithZod(rejectSkillParamsSchema),
            body: buildRouteValidationWithZod(rejectSkillBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        const { skillId } = request.params;
        const {
          review_notes,
          rejection_reason,
          suggested_improvements,
          connector_id: connectorId,
        } = request.body;

        const startTime = Date.now();

        try {
          logger.info(
            `[AESOP] Rejecting skill skill_id=${skillId} rejection_reason=${rejection_reason}`
          );

          // 1. Load proposed skill
          let skillDoc;
          try {
            skillDoc = await esClient.get({
              index: '.aesop-proposed-skills',
              id: skillId,
            });
          } catch (error) {
            if (
              getErrorMessage(error).toLowerCase().includes('not_found') ||
              getErrorMessage(error).includes('document_missing_exception') ||
              (error as EsErrorLike | undefined)?.meta?.statusCode === 404
            ) {
              throw new SkillNotFoundError(skillId);
            }
            throw error;
          }

          const skill = skillDoc._source as ProposedSkillDocument | undefined;
          if (!skill) {
            return response.notFound({
              body: { message: `Skill ${skillId} not found or source unavailable` },
            });
          }

          // 2. Validate skill is not already deployed
          if (skill.deployment?.deployed) {
            throw new SkillAlreadyDeployedError(skillId, skill.deployment.agent_builder_skill_id!);
          }

          // 3. Update skill document with rejection
          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            doc: {
              review: {
                status: 'rejected',
                reviewed_by: 'unknown',
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
            refresh: 'wait_for', // Ensure immediately queryable
          });

          // 4. Store rejection feedback for next exploration cycle
          await esClient.index({
            index: '.aesop-rejection-feedback',
            document: {
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
              rejected_by: 'unknown',
              learning_signals: {
                pattern_frequency_threshold:
                  (skill.source?.pattern_frequency ?? 0) < 10 ? 'too_low' : 'acceptable',
                confidence_threshold: skill.confidence < 0.8 ? 'too_low' : 'acceptable',
                validation_score_threshold:
                  (skill.validation?.final_score ?? 0) < 0.85 ? 'failed' : 'passed',
              },
            },
            refresh: 'wait_for',
          });

          const durationMs = Date.now() - startTime;

          logger.info(
            `[AESOP] Skill rejected successfully skill_id=${skillId} rejection_reason=${rejection_reason} duration_ms=${durationMs}`
          );

          // 5. Cross-evaluate remaining pending skills with rejection context
          if (connectorId) {
            const evalsContext = await context.evals;
            const actionsStart = evalsContext.getActionsStart();
            if (actionsStart) {
              // Fire-and-forget: evaluate siblings in the background
              crossEvaluatePendingSkills({
                esClient,
                actionsClient: await actionsStart.getActionsClientWithRequest(request),
                connectorId,
                rejectedSkill: { id: skillId, name: skill.name, rejection_reason, review_notes },
                logger,
              }).catch((err) => {
                logger.error(
                  `[AESOP] Background cross-evaluation failed: ${
                    err instanceof Error ? err.message : String(err)
                  }`
                );
              });
            }
          }

          return response.ok({
            body: {
              success: true,
              message: `Skill '${skill.name}' rejected. ${
                connectorId
                  ? 'Evaluating remaining pending skills for similar issues.'
                  : 'Feedback will inform next exploration cycle.'
              }`,
              skill_id: skillId,
              skill_name: skill.name,
              rejection_reason,
              feedback_stored: true,
              cross_evaluation_triggered: !!connectorId,
            },
          });
        } catch (error) {
          const durationMs = Date.now() - startTime;

          logger.error(
            `[AESOP] Failed to reject skill skill_id=${skillId} duration_ms=${durationMs}: ${getErrorMessage(
              error
            )}`
          );

          if (error instanceof AESOPError) {
            return response.customError({
              statusCode: error.statusCode,
              body: { message: error.message },
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

/**
 * After a skill is rejected, evaluate all other pending skills to check
 * if the same issues apply. Uses LLM to compare each pending skill against
 * the rejection feedback.
 */
async function crossEvaluatePendingSkills({
  esClient,
  actionsClient,
  connectorId,
  rejectedSkill,
  logger,
}: {
  esClient: ElasticsearchClient;
  actionsClient: ActionsClient;
  connectorId: string;
  rejectedSkill: { id: string; name: string; rejection_reason: string; review_notes: string };
  logger: Logger;
}) {
  // Find all pending_review skills that haven't been validated yet
  const result = await esClient.search({
    index: '.aesop-proposed-skills',
    query: {
      bool: {
        must: [{ term: { 'review.status': 'pending_review' } }],
        must_not: [{ ids: { values: [rejectedSkill.id] } }],
      },
    },
    size: 20,
  });

  const pendingSkills = result.hits.hits;
  if (pendingSkills.length === 0) {
    logger.info('[AESOP] No pending skills to cross-evaluate');
    return;
  }

  logger.info(
    `[AESOP] Cross-evaluating ${pendingSkills.length} pending skills against rejection feedback`
  );

  // Build a single LLM call with all pending skills for efficiency
  const skillSummaries = pendingSkills.map((hit) => {
    const src = (hit._source ?? {}) as Partial<ProposedSkillDocument> & {
      markdown?: string;
    };
    return {
      id: hit._id,
      name: src.name,
      description: src.description,
      markdown_preview: (src.markdown || '').slice(0, 500),
      confidence: src.confidence,
    };
  });

  const prompt = `A security operations skill was just rejected by a human reviewer.

## Rejected Skill
**Name:** ${rejectedSkill.name}
**Rejection Reason:** ${rejectedSkill.rejection_reason}
**Reviewer Notes:** ${rejectedSkill.review_notes || 'No notes provided'}

## Pending Skills to Evaluate
${skillSummaries
  .map(
    (s, i) => `### ${i + 1}. ${s.name} (ID: ${s.id})
${s.description}
Confidence: ${((s.confidence || 0) * 100).toFixed(0)}%
Preview: ${s.markdown_preview}
`
  )
  .join('\n')}

For each pending skill, determine if the rejection feedback applies to it.
Respond with ONLY a JSON array (no markdown fences):
[
  { "id": "<skill_id>", "affected": true/false, "reason": "<why it is/isn't affected>", "severity": "high"|"medium"|"low"|"none" }
]

"affected" means the same issues that caused the rejection also apply to this skill.`;

  try {
    const connectorTypeId = await getConnectorTypeId(actionsClient, connectorId);
    const llmResult = await actionsClient.execute({
      actionId: connectorId,
      params: {
        subAction: 'run',
        subActionParams: {
          body: JSON.stringify(
            buildLlmRequestBody({
              system:
                'You are a skill quality reviewer. Evaluate whether rejection feedback for one skill applies to other pending skills. Be precise and concise.',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.2,
              connectorTypeId,
            })
          ),
        },
      },
    });

    if (llmResult.status === 'error') {
      logger.warn(`[AESOP] Cross-evaluation LLM call failed: ${llmResult.message}`);
      return;
    }

    const rawResponse = extractLlmResponseText(llmResult.data);
    const evaluations = parseCrossEvaluation(rawResponse);

    // Act on affected skills based on severity
    let autoRejected = 0;
    let autoImproved = 0;

    for (const evaluation of evaluations) {
      if (!evaluation.affected || evaluation.severity === 'none') continue;

      if (evaluation.severity === 'high') {
        // Auto-reject: same fundamental issues, not worth improving
        await esClient
          .update({
            index: '.aesop-proposed-skills',
            id: evaluation.id,
            doc: {
              review: {
                status: 'rejected',
                reviewed_by: 'aesop-auto',
                reviewed_at: new Date().toISOString(),
                review_notes: `Auto-rejected: shares same issues as rejected skill "${rejectedSkill.name}". ${evaluation.reason}`,
                rejection_reason: rejectedSkill.rejection_reason,
              },
              cross_evaluation: {
                triggered_by_rejection: rejectedSkill.id,
                action: 'auto_rejected',
                severity: evaluation.severity,
                reason: evaluation.reason,
                evaluated_at: new Date().toISOString(),
              },
            },
            refresh: 'wait_for',
          })
          .catch((err: Error) => {
            logger.warn(`[AESOP] Failed to auto-reject skill ${evaluation.id}: ${err.message}`);
          });

        autoRejected++;
        logger.info(`[AESOP] Auto-rejected skill ${evaluation.id}: ${evaluation.reason}`);
      } else {
        // Medium/low severity: flag with warning but keep for review
        await esClient
          .update({
            index: '.aesop-proposed-skills',
            id: evaluation.id,
            doc: {
              cross_evaluation: {
                triggered_by_rejection: rejectedSkill.id,
                action: 'flagged',
                severity: evaluation.severity,
                reason: evaluation.reason,
                evaluated_at: new Date().toISOString(),
              },
            },
          })
          .catch((err: Error) => {
            logger.warn(`[AESOP] Failed to flag skill ${evaluation.id}: ${err.message}`);
          });

        autoImproved++;
        logger.info(
          `[AESOP] Flagged skill ${evaluation.id} (${evaluation.severity}): ${evaluation.reason}`
        );
      }
    }

    const totalAffected = evaluations.filter((e) => e.affected).length;
    logger.info(
      `[AESOP] Cross-evaluation complete: ${totalAffected} affected, ${autoRejected} auto-rejected, ${autoImproved} flagged`
    );
  } catch (error) {
    logger.error(
      `[AESOP] Cross-evaluation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

interface CrossEvaluationItem {
  id: string;
  affected: boolean;
  reason: string;
  severity: string;
}

function parseCrossEvaluation(response: string): CrossEvaluationItem[] {
  try {
    let cleaned = response;
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '');
    cleaned = cleaned
      .replace(/```json?\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    if (!cleaned.startsWith('[')) {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) cleaned = match[0];
    }
    const parsed: unknown = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((raw) => {
      const item = (raw ?? {}) as Record<string, unknown>;
      return {
        id: String(item.id ?? ''),
        affected: Boolean(item.affected),
        reason: String(item.reason ?? ''),
        severity: String(item.severity ?? 'none'),
      };
    });
  } catch {
    return [];
  }
}
