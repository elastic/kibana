/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { SkillRouteDependencies } from '.';
import { SkillDatasetGenerator } from '../../lib/aesop/skill_dataset_generator';

const paramsSchema = z.object({ skillId: z.string() });

const bodySchema = z.object({
  connector_id: z.string().min(1),
  count: z.number().min(5).max(50).optional().default(10),
});

export function registerSkillGenerateEvalDatasetRoute({ router, logger }: SkillRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/evals/skills/{skillId}/generate-eval-dataset',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
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
        const { connector_id: connectorId, count } = request.body;
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

          // Get actions client for LLM calls
          const actionsStart = evalsContext.getActionsStart();
          if (!actionsStart) {
            return response.badRequest({
              body: { message: 'Actions plugin not available' },
            });
          }
          const actionsClient = await actionsStart.getActionsClientWithRequest(request);

          // Generate test cases
          const generator = new SkillDatasetGenerator(logger);
          const testCases = await generator.generateTestCases(
            {
              id: skillId,
              name: skill.name,
              description: skill.description,
              markdown: skill.content,
            },
            { actionsClient, connectorId, count }
          );

          if (testCases.length === 0) {
            return response.customError({
              statusCode: 422,
              body: { message: 'LLM generated no valid test cases' },
            });
          }

          // Upsert dataset
          const datasetName = `skill-eval:${skillId}`;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const datasetClient = evalsContext.datasetService.getClient(esClient);
          const upsertResult = await datasetClient.upsert(
            datasetName,
            `Eval dataset for skill: ${skill.name}`,
            testCases.map((tc) => ({
              input: tc.input,
              output: tc.output,
              metadata: tc.metadata,
            }))
          );

          return response.ok({
            body: {
              dataset_id: upsertResult.dataset_id,
              dataset_name: datasetName,
              added: upsertResult.added,
              removed: upsertResult.removed,
              unchanged: upsertResult.unchanged,
              total: testCases.length,
            },
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error(`[Evals] Failed to generate eval dataset for skill: ${msg}`);
          const isConnectorIssue = /Connector execution failed|security token|Forbidden|Unauthorized|rate limit|max_tokens|anthropic_version/i.test(
            msg
          );
          return response.customError({
            statusCode: isConnectorIssue ? 400 : 500,
            body: {
              message: isConnectorIssue
                ? `LLM connector failed: ${msg}`
                : `Failed to generate eval dataset: ${msg}`,
            },
          });
        }
      }
    );
}
