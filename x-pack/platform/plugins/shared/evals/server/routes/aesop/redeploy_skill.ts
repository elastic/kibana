/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { AESOPRouteDependencies } from './register_aesop_routes';

const redeploySkillParamsSchema = z.object({
  skillId: z.string().min(1),
});

const TOOL_KEYWORD_MAP: Array<{ keywords: string[]; toolId: string }> = [
  { keywords: ['esql', 'es|ql', 'FROM ', 'STATS ', 'WHERE '], toolId: 'platform.core.execute_esql' },
  { keywords: ['esql', 'es|ql', 'query'], toolId: 'platform.core.generate_esql' },
  { keywords: ['visualization', 'chart', 'dashboard', 'graph'], toolId: 'platform.core.create_visualization' },
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

          const skill = skillDoc._source as any;
          const agentBuilderSkillId = skill.deployment?.agent_builder_skill_id || `aesop-${skillId}`;
          const toolIds = inferTools(skill.markdown || '').slice(0, MAX_TOOLS);

          logger.info('[AESOP] Re-deploying skill to Agent Builder', {
            skill_id: skillId,
            agent_builder_skill_id: agentBuilderSkillId,
          });

          const host = request.headers.host || 'localhost:5601';
          const protocol = (request.headers['x-forwarded-proto'] as string) || 'http';
          const kibanaUrl = `${protocol}://${host}`;

          // Try to delete existing skill first (may not exist)
          await fetch(`${kibanaUrl}/api/agent_builder/skills/${agentBuilderSkillId}`, {
            method: 'DELETE',
            headers: {
              'kbn-xsrf': 'true',
              'x-elastic-internal-origin': 'kibana',
              'elastic-api-version': '2023-10-31',
              Authorization: request.headers.authorization as string,
            },
          }).catch(() => {});

          // Create the skill
          const createResponse = await fetch(`${kibanaUrl}/api/agent_builder/skills`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'kbn-xsrf': 'true',
              'x-elastic-internal-origin': 'kibana',
              'elastic-api-version': '2023-10-31',
              Authorization: request.headers.authorization as string,
            },
            body: JSON.stringify({
              id: agentBuilderSkillId,
              name: sanitizeSkillName(skill.name),
              description: (skill.description || '').slice(0, 1024),
              content: skill.markdown || '',
              tool_ids: toolIds,
            }),
          });

          if (!createResponse.ok) {
            const errorBody = await createResponse.text();
            throw new Error(`Agent Builder API returned ${createResponse.status}: ${errorBody}`);
          }

          // Update deployment timestamp
          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            body: {
              doc: {
                deployment: {
                  deployed: true,
                  deployed_at: new Date().toISOString(),
                  agent_builder_skill_id: agentBuilderSkillId,
                  tool_ids: toolIds,
                  redeployed: true,
                },
              },
            },
            refresh: 'wait_for',
          });

          logger.info('[AESOP] Skill re-deployed', { skill_id: skillId });

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
              message: `Failed to re-deploy: ${error instanceof Error ? error.message : String(error)}`,
            },
          });
        }
      }
    );
}
