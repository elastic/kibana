/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { AESOPRouteDependencies } from './register_aesop_routes';
import type { ProposedSkillDocument } from '../../lib/aesop/types';
import { sanitizeSkillMarkdown } from '../../lib/aesop/security/input_sanitization';

const approveSkillParamsSchema = z.object({
  skillId: z.string(),
});

const approveSkillBodySchema = z.object({
  review_notes: z.string().optional(),
  update_existing: z.boolean().optional().default(false),
});

// Map skill content keywords to Agent Builder tool IDs
const TOOL_KEYWORD_MAP: Array<{ keywords: string[]; toolId: string }> = [
  {
    keywords: ['esql', 'es|ql', 'FROM ', 'STATS ', 'WHERE '],
    toolId: 'platform.core.execute_esql',
  },
  { keywords: ['esql', 'es|ql', 'query'], toolId: 'platform.core.generate_esql' },
  {
    keywords: ['visualization', 'chart', 'dashboard', 'graph'],
    toolId: 'platform.core.create_visualization',
  },
  { keywords: ['alert', 'rule', 'detection'], toolId: 'security.create_detection_rule' },
];

// Agent Builder validation constants (from @kbn/agent-builder-common)
const SKILL_ID_MAX = 64;
const SKILL_NAME_MAX = 64;
const SKILL_ID_RE = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;
const SKILL_NAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9 _-]*[a-zA-Z0-9])?$/;
const MAX_TOOLS = 5;

export function sanitizeSkillId(raw: string): string {
  let id = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-');
  if (id.length > SKILL_ID_MAX) id = id.slice(0, SKILL_ID_MAX);
  id = id.replace(/^[^a-z0-9]+/, '').replace(/[^a-z0-9]+$/, '');
  if (!id || !SKILL_ID_RE.test(id)) {
    // Generate a safe fallback ID
    return `aesop-${Date.now().toString(36)}`;
  }
  return id;
}

export function sanitizeSkillName(name: string): string {
  let sanitized = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
  if (sanitized.length > SKILL_NAME_MAX) sanitized = sanitized.slice(0, SKILL_NAME_MAX).trim();
  sanitized = sanitized.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9]+$/, '');
  return SKILL_NAME_RE.test(sanitized) ? sanitized : 'AESOP Skill';
}

export function inferTools(markdown: string): string[] {
  const lower = (markdown || '').toLowerCase();
  const tools = new Set<string>();
  for (const { keywords, toolId } of TOOL_KEYWORD_MAP) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      tools.add(toolId);
    }
  }
  return Array.from(tools);
}

export function registerApproveSkillRoute({ router, logger }: AESOPRouteDependencies) {
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
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        const { skillId } = request.params;
        const { review_notes, update_existing } = request.body;

        try {
          // 1. Load proposed skill
          const skillDoc = await esClient.get({
            index: '.aesop-proposed-skills',
            id: skillId,
          });

          const skill = skillDoc._source as ProposedSkillDocument | undefined;
          if (!skill) {
            return response.notFound({
              body: { message: `Skill ${skillId} not found or source unavailable` },
            });
          }

          // 2. Validate skill passed evaluations
          if (skill.validation?.status !== 'passed') {
            return response.badRequest({
              body: {
                message: `Skill must pass validation before approval. Current status: ${
                  skill.validation?.status || 'pending'
                }`,
              },
            });
          }

          // 3. Determine whether to update an existing skill or create a new one
          const isUpdateExisting =
            update_existing && skill.base_skill?.id && skill.base_skill?.readonly === false;

          // 4. Generate a valid skill ID for Agent Builder
          const agentBuilderSkillId = isUpdateExisting
            ? skill.base_skill!.id
            : sanitizeSkillId(`aesop-${skillId}`);

          // 5. Infer tools from skill content (max 5)
          const toolIds = inferTools(skill.markdown || '').slice(0, MAX_TOOLS);

          logger.info(
            `[AESOP] Deploying skill to Agent Builder skill_id=${skillId} agent_builder_skill_id=${agentBuilderSkillId} update_existing=${isUpdateExisting} tool_ids=${toolIds.join(
              ','
            )}`
          );

          // 6. Create or update skill in Agent Builder via SkillRegistry
          const evalsContext = await context.evals;
          const agentBuilderStart = await evalsContext.getAgentBuilderStart();
          if (!agentBuilderStart) {
            throw new Error('Agent Builder plugin not available — cannot deploy skills');
          }
          const skillRegistry = await agentBuilderStart.skills.getRegistry({ request });

          // Sanitize content before deploying to Agent Builder
          const sanitizedContent = sanitizeSkillMarkdown(skill.markdown || '');
          const sanitizedDescription = sanitizeSkillMarkdown(skill.description || '').slice(
            0,
            1024
          );

          // 6a. Mark deployment intent in ES FIRST (before deploying to Agent Builder)
          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            doc: {
              review: {
                status: 'approved',
                reviewed_by: 'unknown',
                reviewed_at: new Date().toISOString(),
                review_notes,
              },
              deployment: {
                deployed: true,
                deployed_at: new Date().toISOString(),
                tool_ids: toolIds,
                updated_existing: isUpdateExisting || false,
              },
            },
            refresh: 'wait_for',
          });

          // 6b. Deploy to Agent Builder
          let createdSkill: { id: string };
          try {
            if (isUpdateExisting) {
              // Update existing user skill
              createdSkill = await skillRegistry.update(agentBuilderSkillId, {
                name: sanitizeSkillName(skill.name || 'Untitled Skill'),
                description: sanitizedDescription,
                content: sanitizedContent,
                tool_ids: toolIds,
              });
            } else {
              // Create new skill
              createdSkill = await skillRegistry.create({
                id: agentBuilderSkillId,
                name: sanitizeSkillName(skill.name || 'Untitled Skill'),
                description: sanitizedDescription,
                content: sanitizedContent,
                tool_ids: toolIds,
              });
            }
          } catch (deployError) {
            // Rollback: revert deployment status on Agent Builder failure
            await esClient
              .update({
                index: '.aesop-proposed-skills',
                id: skillId,
                doc: {
                  review: { status: 'pending_review' },
                  deployment: { deployed: false },
                },
              })
              .catch(() => {});
            throw deployError;
          }

          logger.info(
            `[AESOP] Skill deployed to Agent Builder skill_id=${skillId} agent_builder_skill_id=${createdSkill.id} update_existing=${isUpdateExisting}`
          );

          // 6c. Update ES document with Agent Builder skill ID
          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            doc: {
              deployment: {
                agent_builder_skill_id: createdSkill.id,
              },
            },
            refresh: 'wait_for',
          });

          return response.ok({
            body: {
              success: true,
              message: `Skill "${skill.name}" approved and deployed to Agent Builder`,
              skill_id: skillId,
              agent_builder_skill_id: createdSkill.id,
              tool_ids: toolIds,
            },
          });
        } catch (error) {
          logger.error(
            `[AESOP] Failed to approve skill skill_id=${skillId}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to approve skill: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          });
        }
      }
    );
}
