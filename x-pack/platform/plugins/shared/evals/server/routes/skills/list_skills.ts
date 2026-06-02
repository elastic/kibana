/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillRouteDependencies } from '.';

/**
 * `GET /internal/evals/skills`
 *
 * Returns a lightweight summary of every skill registered with Agent
 * Builder. Used by `scripts/test_skill_eval_e2e.sh` and surfaces the
 * `id` + `name` of skills that consumers can drill into via the per-skill
 * detail endpoints.
 *
 * Performance note: prior versions of this route awaited
 * `skill.getRegistryTools()` for every skill in the listing (N+1 against
 * a registry whose persistence layer does not always batch). We deliberately
 * skip that here — `tool_ids` belongs on the per-skill detail endpoint
 * (`GET /internal/evals/skills/{skillId}/...`) where the caller has already
 * narrowed to a single skill and the cost of one extra await is irrelevant.
 */
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

        const skills = allSkills.map((skill: any) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          readonly: skill.readonly,
          experimental: skill.experimental,
        }));

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
