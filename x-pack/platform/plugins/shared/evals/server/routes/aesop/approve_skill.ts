/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { AESOPRouteDependencies } from './register_aesop_routes';

const approveSkillParamsSchema = z.object({
  skillId: z.string(),
});

const approveSkillBodySchema = z.object({
  review_notes: z.string().optional(),
});

// Map skill content keywords to Agent Builder tool IDs
const TOOL_KEYWORD_MAP: Array<{ keywords: string[]; toolId: string }> = [
  { keywords: ['esql', 'es|ql', 'FROM ', 'STATS ', 'WHERE '], toolId: 'platform.core.execute_esql' },
  { keywords: ['esql', 'es|ql', 'query'], toolId: 'platform.core.generate_esql' },
  { keywords: ['visualization', 'chart', 'dashboard', 'graph'], toolId: 'platform.core.create_visualization' },
  { keywords: ['alert', 'rule', 'detection'], toolId: 'security.create_detection_rule' },
];

// Agent Builder validation constants (from @kbn/agent-builder-common)
const SKILL_ID_MAX = 64;
const SKILL_NAME_MAX = 64;
const SKILL_ID_RE = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;
const SKILL_NAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9 _-]*[a-zA-Z0-9])?$/;
const MAX_TOOLS = 5;

function sanitizeSkillId(raw: string): string {
  let id = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  if (id.length > SKILL_ID_MAX) id = id.slice(0, SKILL_ID_MAX);
  id = id.replace(/^[^a-z0-9]+/, '').replace(/[^a-z0-9]+$/, '');
  return SKILL_ID_RE.test(id) ? id : `aesop-${id}`.slice(0, SKILL_ID_MAX);
}

function sanitizeSkillName(name: string): string {
  let sanitized = name.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
  if (sanitized.length > SKILL_NAME_MAX) sanitized = sanitized.slice(0, SKILL_NAME_MAX).trim();
  sanitized = sanitized.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9]+$/, '');
  return SKILL_NAME_RE.test(sanitized) ? sanitized : 'AESOP Skill';
}

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
        const { review_notes } = request.body;

        try {
          // 1. Load proposed skill
          const skillDoc = await esClient.get({
            index: '.aesop-proposed-skills',
            id: skillId,
          });

          // TODO: Replace with a proper ProposedSkill type when moving beyond spike
          const skill = skillDoc._source as any;

          // 2. Validate skill passed evaluations
          if (skill.validation?.status !== 'passed') {
            return response.badRequest({
              body: {
                message: `Skill must pass validation before approval. Current status: ${skill.validation?.status || 'pending'}`,
              },
            });
          }

          // 3. Generate a valid skill ID for Agent Builder
          const agentBuilderSkillId = sanitizeSkillId(`aesop-${skillId}`);

          // 4. Infer tools from skill content (max 5)
          const toolIds = inferTools(skill.markdown || '').slice(0, MAX_TOOLS);

          logger.info('[AESOP] Deploying skill to Agent Builder', {
            skill_id: skillId,
            agent_builder_skill_id: agentBuilderSkillId,
            tool_ids: toolIds,
          });

          // 5. Create skill in Agent Builder via internal Kibana API
          const host = request.headers.host || 'localhost:5601';
          const protocol = (request.headers['x-forwarded-proto'] as string) || 'http';
          const kibanaUrl = `${protocol}://${host}`;

          const agentBuilderResponse = await fetch(
            `${kibanaUrl}/api/agent_builder/skills`,
            {
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
            }
          );

          if (!agentBuilderResponse.ok) {
            const errorBody = await agentBuilderResponse.text();
            throw new Error(`Agent Builder API returned ${agentBuilderResponse.status}: ${errorBody}`);
          }

          const createdSkill = await agentBuilderResponse.json();

          logger.info('[AESOP] Skill deployed to Agent Builder', {
            skill_id: skillId,
            agent_builder_skill_id: createdSkill.id,
            tools: toolIds,
          });

          // 6. Update proposed skill document with approval
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
                  deployed_at: new Date().toISOString(),
                  agent_builder_skill_id: createdSkill.id,
                  tool_ids: toolIds,
                },
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
          logger.error('[AESOP] Failed to approve skill', {
            error: error instanceof Error ? error.message : String(error),
            skill_id: skillId,
          });

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to approve skill: ${error instanceof Error ? error.message : String(error)}`,
            },
          });
        }
      }
    );
}
