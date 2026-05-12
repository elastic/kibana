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

const redeploySkillParamsSchema = z.object({
  skillId: z.string().min(1),
});

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
];

function inferTools(markdown: string): string[] {
  const lower = (markdown || '').toLowerCase();
  const tools = new Set<string>();
  for (const { keywords, toolId } of TOOL_KEYWORD_MAP) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      tools.add(toolId);
    }
  }
  return Array.from(tools);
}

const SKILL_NAME_MAX = 64;
const SKILL_NAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9 _-]*[a-zA-Z0-9])?$/;
const MAX_TOOLS = 5;

function sanitizeSkillName(name: string): string {
  let sanitized = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
  if (sanitized.length > SKILL_NAME_MAX) sanitized = sanitized.slice(0, SKILL_NAME_MAX).trim();
  sanitized = sanitized.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9]+$/, '');
  return SKILL_NAME_RE.test(sanitized) ? sanitized : 'AESOP Skill';
}

export function registerRedeploySkillRoute({ router, logger }: AESOPRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/aesop/skills/{skillId}/redeploy',
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
            params: buildRouteValidationWithZod(redeploySkillParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        const { skillId } = request.params;

        try {
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
          const agentBuilderSkillId =
            skill.deployment?.agent_builder_skill_id || `aesop-${skillId}`;
          const toolIds = inferTools(skill.markdown || '').slice(0, MAX_TOOLS);

          logger.info(
            `[AESOP] Re-deploying skill to Agent Builder skill_id=${skillId} agent_builder_skill_id=${agentBuilderSkillId}`
          );

          // Get Agent Builder SkillRegistry
          const evalsContext = await context.evals;
          const agentBuilderStart = await evalsContext.getAgentBuilderStart();
          if (!agentBuilderStart) {
            throw new Error('Agent Builder plugin not available — cannot redeploy skills');
          }
          const skillRegistry = await agentBuilderStart.skills.getRegistry({ request });

          // Delete existing skill if it exists (ignore errors if not found)
          const skillExists = await skillRegistry.has(agentBuilderSkillId);
          if (skillExists) {
            await skillRegistry.delete(agentBuilderSkillId);
          }

          // Sanitize content before deploying to Agent Builder
          const sanitizedContent = sanitizeSkillMarkdown(skill.markdown || '');
          const sanitizedDescription = sanitizeSkillMarkdown(skill.description || '').slice(
            0,
            1024
          );

          // Create the skill
          await skillRegistry.create({
            id: agentBuilderSkillId,
            name: sanitizeSkillName(skill.name),
            description: sanitizedDescription,
            content: sanitizedContent,
            tool_ids: toolIds,
          });

          // Update deployment timestamp
          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            doc: {
              deployment: {
                deployed: true,
                deployed_at: new Date().toISOString(),
                agent_builder_skill_id: agentBuilderSkillId,
                tool_ids: toolIds,
                redeployed: true,
              },
            },
            refresh: 'wait_for',
          });

          logger.info(`[AESOP] Skill re-deployed skill_id=${skillId}`);

          return response.ok({
            body: {
              success: true,
              skill_id: skillId,
              agent_builder_skill_id: agentBuilderSkillId,
            },
          });
        } catch (error) {
          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to re-deploy: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          });
        }
      }
    );
}
