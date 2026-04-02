/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { SkillRouteDependencies } from '.';
import { proposeEvaluatorsForSkill } from '../../lib/aesop/skill_evaluator_selector';

const paramsSchema = z.object({ skillId: z.string() });

const bodySchema = z.object({
  connector_id: z.string().min(1),
});

export function registerSkillProposeEvaluatorsRoute({
  router,
  logger,
  skillOnlineEvalService,
}: SkillRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/evals/skills/{skillId}/propose-evaluators',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
      options: { timeout: { idleSocket: 60_000 } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(paramsSchema),
            body: buildRouteValidationWithZod(bodySchema),
          },
        },
      },
      async (context, request, response) => {
        const { skillId } = request.params;
        const { connector_id: connectorId } = request.body;
        const evalsContext = await context.evals;

        try {
          // Load skill from Agent Builder registry
          const agentBuilderStart = await evalsContext.getAgentBuilderStart();
          if (!agentBuilderStart) {
            return response.badRequest({
              body: { message: 'Agent Builder plugin not available' },
            });
          }

          const skillRegistry = await agentBuilderStart.skills.getRegistry({ request });
          const skill = await skillRegistry.get(skillId);
          if (!skill) {
            return response.notFound({
              body: { message: `Skill ${skillId} not found` },
            });
          }

          const registry = skillOnlineEvalService?.evaluatorRegistry;
          if (!registry) {
            return response.badRequest({
              body: { message: 'Evaluator registry not available' },
            });
          }

          // Get actions client for LLM suggestions
          const actionsStart = evalsContext.getActionsStart();
          let llmOptions:
            | {
                connectorId: string;
                actionsClient: { execute: (...args: any[]) => Promise<any> };
              }
            | undefined;

          if (actionsStart && connectorId) {
            try {
              const actionsClient = await actionsStart.getActionsClientWithRequest(request);
              llmOptions = { connectorId, actionsClient };
            } catch (err) {
              logger.warn(
                `Failed to get actions client: ${err instanceof Error ? err.message : String(err)}`
              );
            }
          }

          const { proposed } = await proposeEvaluatorsForSkill(
            { name: skill.name, description: skill.description, markdown: skill.content },
            registry,
            logger,
            llmOptions
          );

          return response.ok({
            body: {
              skill_id: skillId,
              skill_name: skill.name,
              proposed_evaluators: proposed,
              total: proposed.length,
              selected_count: proposed.filter((e) => e.selected).length,
            },
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error(`[Evals] Failed to propose evaluators for skill: ${msg}`);
          return response.customError({ statusCode: 500, body: { message: msg } });
        }
      }
    );
}
