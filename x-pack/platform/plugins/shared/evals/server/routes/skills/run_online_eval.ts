/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { SkillRouteDependencies } from '.';
import { selectEvaluatorsForSkill } from '../../lib/aesop/skill_evaluator_selector';

const paramsSchema = z.object({ skillId: z.string() });

const bodySchema = z.object({
  connector_id: z.string().min(1),
  evaluator_names: z.array(z.string()).optional(),
});

export function registerSkillRunOnlineEvalRoute({
  router,
  logger,
  skillOnlineEvalService,
}: SkillRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/evals/skills/{skillId}/run-online-eval',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
      options: { timeout: { idleSocket: 120_000 } },
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
        const { connector_id: connectorId, evaluator_names: evaluatorNames } = request.body;
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

          // Get actions client
          const actionsStart = evalsContext.getActionsStart();
          if (!actionsStart) {
            return response.badRequest({
              body: { message: 'Actions plugin not available' },
            });
          }
          const actionsClient = await actionsStart.getActionsClientWithRequest(request);

          if (!skillOnlineEvalService) {
            return response.badRequest({
              body: { message: 'Online eval service not initialized' },
            });
          }

          // Auto-select evaluators if none specified
          let resolvedEvaluatorNames = evaluatorNames;
          if (!resolvedEvaluatorNames?.length && skillOnlineEvalService.evaluatorRegistry) {
            const selection = selectEvaluatorsForSkill(
              {
                name: skill.name,
                description: skill.description,
                markdown: skill.content,
              },
              skillOnlineEvalService.evaluatorRegistry,
              logger
            );
            resolvedEvaluatorNames = selection.evaluatorNames;
          }

          // Filter to evaluators that exist in the registry, track which were dropped
          let droppedEvaluators: string[] = [];
          if (resolvedEvaluatorNames?.length && skillOnlineEvalService.evaluatorRegistry) {
            const registry = skillOnlineEvalService.evaluatorRegistry;
            droppedEvaluators = resolvedEvaluatorNames.filter(
              (name: string) => !registry.has(name)
            );
            resolvedEvaluatorNames = resolvedEvaluatorNames.filter((name: string) =>
              registry.has(name)
            );
          }

          if (!resolvedEvaluatorNames?.length) {
            return response.badRequest({
              body: {
                message:
                  'No valid evaluators available. Save proposed evaluators to the catalog first.',
              },
            });
          }

          const coreContext = await context.core;
          const scopedEsClient = coreContext.elasticsearch.client.asCurrentUser;

          // Register tracked run for progress polling
          const runId = `eval-${Date.now()}`;
          skillOnlineEvalService.registerRun(skillId, runId);

          skillOnlineEvalService
            .runOnlineEval(
              {
                id: skillId,
                name: skill.name,
                description: skill.description,
                markdown: skill.content,
              },
              {
                connectorId,
                actionsClient,
                esClient: scopedEsClient,
                evaluatorNames: resolvedEvaluatorNames,
                datasetNamePrefix: 'skill-eval',
                runId,
              }
            )
            .then((result) => {
              logger.info(
                `[Evals] Online eval completed for skill "${skill.name}": ${
                  result.examplesRan
                } examples, mean score ${result.summary.meanScore.toFixed(2)}`
              );
            })
            .catch((err: unknown) => {
              const msg = err instanceof Error ? err.message : String(err);
              logger.error(`[Evals] Online eval failed for skill "${skill.name}": ${msg}`);
              skillOnlineEvalService.failRun(runId, msg);
            });

          // Return immediately with tracking info
          return response.ok({
            body: {
              status: 'started',
              run_id: runId,
              evaluators: resolvedEvaluatorNames,
              dropped_evaluators: droppedEvaluators,
              message: `Evaluation started with ${resolvedEvaluatorNames.length} evaluators`,
            },
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error(`[Evals] Online eval failed: ${msg}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Online eval failed: ${msg}` },
          });
        }
      }
    );
}
