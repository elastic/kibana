/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillRouteDependencies } from '.';

export function registerListSkillsRoute({ router, logger }: SkillRouteDependencies) {
  router.versioned
    .get({
      path: '/internal/evals/skills',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
    })
    .addVersion({ version: '1', validate: {} }, async (context, request, response) => {
      try {
        const evalsContext = await context.evals;
        const agentBuilderStart = await evalsContext.getAgentBuilderStart();
        if (!agentBuilderStart) {
          return response.ok({ body: { skills: [] } });
        }

        const skillRegistry = await agentBuilderStart.skills.getRegistry({ request });
        const allSkills = await skillRegistry.list();

        const skills = await Promise.all(
          allSkills.map(async (skill: any) => {
            const toolIds = await skill.getRegistryTools();
            return {
              id: skill.id,
              name: skill.name,
              description: skill.description,
              readonly: skill.readonly,
              experimental: skill.experimental,
              tool_ids: toolIds,
            };
          })
        );

        return response.ok({ body: { skills } });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`[Evals] Failed to list Agent Builder skills: ${msg}`);
        return response.customError({
          statusCode: 500,
          body: { message: `Failed to list skills: ${msg}` },
        });
      }
    });
}
