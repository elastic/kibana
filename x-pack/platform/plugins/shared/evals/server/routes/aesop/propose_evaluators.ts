/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { AESOPRouteDependencies } from './register_aesop_routes';
import type { ProposedSkillDocument } from '../../lib/aesop/types';
import {
  proposeEvaluatorsForSkill,
  type ProposedEvaluator,
} from '../../lib/aesop/skill_evaluator_selector';

type ActionsClient = Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>;

export type { ProposedEvaluator };

const proposeEvaluatorsParamsSchema = z.object({ skillId: z.string() });

const proposeEvaluatorsBodySchema = z.object({
  connector_id: z.string().min(1),
});

export function registerProposeEvaluatorsRoute({
  router,
  logger,
  skillOnlineEvalService,
}: AESOPRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/aesop/skills/{skillId}/propose-evaluators',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
      options: { timeout: { idleSocket: 60_000 } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(proposeEvaluatorsParamsSchema),
            body: buildRouteValidationWithZod(proposeEvaluatorsBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const { skillId } = request.params;
        const { connector_id: connectorId } = request.body;
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client;
        const evalsContext = await context.evals;

        try {
          // Load skill from AESOP proposed skills index
          const skillDoc = await esClient.asCurrentUser.get({
            index: '.aesop-proposed-skills',
            id: skillId,
          });
          const skill = skillDoc._source as ProposedSkillDocument | undefined;
          if (!skill) {
            return response.notFound({ body: { message: `Skill ${skillId} not found` } });
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
                actionsClient: ActionsClient;
              }
            | undefined;

          if (actionsStart && connectorId) {
            try {
              const actionsClient = await actionsStart.getActionsClientWithRequest(request);
              llmOptions = { connectorId, actionsClient };
            } catch (err) {
              logger.warn(
                `Failed to get actions client for LLM suggestions: ${
                  err instanceof Error ? err.message : String(err)
                }`
              );
            }
          }

          const { proposed } = await proposeEvaluatorsForSkill(
            { name: skill.name, description: skill.description, markdown: skill.markdown },
            registry,
            logger,
            llmOptions
          );

          // Cache proposed evaluators on the skill document
          await esClient.asCurrentUser
            .update({
              index: '.aesop-proposed-skills',
              id: skillId,
              doc: { proposed_evaluators_cache: proposed },
            })
            .catch((err: unknown) => {
              logger.warn(
                `[AESOP] Failed to cache proposed evaluators: ${
                  err instanceof Error ? err.message : String(err)
                }`
              );
            });

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
          logger.error(`[AESOP] Failed to propose evaluators: ${msg}`);
          return response.customError({ statusCode: 500, body: { message: msg } });
        }
      }
    );
}
