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
import { selectEvaluatorsForSkill } from '../../lib/aesop/skill_evaluator_selector';

const runEvalParamsSchema = z.object({ skillId: z.string() });

const runEvalBodySchema = z.object({
  connector_id: z.string().min(1),
  evaluator_names: z.array(z.string()).optional(),
});

export function registerRunOnlineEvalRoute({
  router,
  logger,
  skillOnlineEvalService,
}: AESOPRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/aesop/skills/{skillId}/run-online-eval',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
      options: { timeout: { idleSocket: 120_000 } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(runEvalParamsSchema),
            body: buildRouteValidationWithZod(runEvalBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const { skillId } = request.params;
        const { connector_id: connectorId, evaluator_names: evaluatorNames } = request.body;
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client;
        // Capture the scoped client reference for use in fire-and-forget callbacks.
        // kibana_system (asInternalUser) doesn't have write access to .aesop-proposed-skills.
        const scopedEsClient = esClient.asCurrentUser;
        const evalsContext = await context.evals;

        try {
          // Load skill
          const skillDoc = await scopedEsClient.get({
            index: '.aesop-proposed-skills',
            id: skillId,
          });
          const skill = skillDoc._source as ProposedSkillDocument | undefined;
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
              { name: skill.name, description: skill.description, markdown: skill.markdown },
              skillOnlineEvalService.evaluatorRegistry,
              logger
            );
            resolvedEvaluatorNames = selection.evaluatorNames;
          }

          // Filter to only evaluators that actually exist in the registry
          if (resolvedEvaluatorNames?.length && skillOnlineEvalService.evaluatorRegistry) {
            const registry = skillOnlineEvalService.evaluatorRegistry;
            const before = resolvedEvaluatorNames.length;
            resolvedEvaluatorNames = resolvedEvaluatorNames.filter((name: string) =>
              registry.has(name)
            );
            if (resolvedEvaluatorNames.length < before) {
              logger.info(
                `[AESOP] Filtered evaluators: ${before} requested, ${resolvedEvaluatorNames.length} available in registry`
              );
            }
          }

          if (!resolvedEvaluatorNames?.length) {
            return response.badRequest({
              body: {
                message:
                  'No valid evaluators available. Save proposed evaluators to the catalog first.',
              },
            });
          }

          // Mark eval as started on the skill doc
          const runId = `eval-${Date.now()}`;
          const startedAt = new Date().toISOString();
          await scopedEsClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            doc: {
              eval_run: {
                run_id: runId,
                status: 'running',
                started_at: startedAt,
                evaluators: resolvedEvaluatorNames,
              },
            },
          });

          // Fire-and-forget — run eval in background
          skillOnlineEvalService
            .runOnlineEval(
              {
                id: skillId,
                name: skill.name,
                description: skill.description,
                markdown: skill.markdown,
              },
              {
                connectorId,
                actionsClient,
                esClient: scopedEsClient,
                evaluatorNames: resolvedEvaluatorNames,
              }
            )
            .then(async (result) => {
              // Update skill doc with results
              await scopedEsClient.update({
                index: '.aesop-proposed-skills',
                id: skillId,
                doc: {
                  eval_run: {
                    run_id: result.runId,
                    status: 'completed',
                    started_at: startedAt,
                    completed_at: new Date().toISOString(),
                    dataset_id: result.datasetId,
                    examples_ran: result.examplesRan,
                    mean_score: result.summary.meanScore,
                    pass_rate: result.summary.passRate,
                    duration_ms: result.durationMs,
                    evaluators: resolvedEvaluatorNames,
                  },
                },
              });
              logger.info(
                `[AESOP] Online eval completed for "${skill.name}": ${result.examplesRan} examples`
              );
            })
            .catch(async (err: unknown) => {
              const msg = err instanceof Error ? err.message : String(err);
              logger.error(`[AESOP] Online eval failed for "${skill.name}": ${msg}`);
              await scopedEsClient
                .update({
                  index: '.aesop-proposed-skills',
                  id: skillId,
                  doc: {
                    eval_run: {
                      run_id: runId,
                      status: 'failed',
                      error: msg,
                      completed_at: new Date().toISOString(),
                    },
                  },
                })
                .catch(() => {});
            });

          // Return immediately
          return response.ok({
            body: {
              status: 'started',
              run_id: runId,
              evaluators: resolvedEvaluatorNames,
              message: `Evaluation started with ${resolvedEvaluatorNames.length} evaluators`,
            },
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error(`[AESOP] Online eval failed: ${msg}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Online eval failed: ${msg}` },
          });
        }
      }
    );
}
