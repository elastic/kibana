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
import { SkillDatasetGenerator } from '../../lib/aesop/skill_dataset_generator';

const generateDatasetParamsSchema = z.object({
  skillId: z.string(),
});

const generateDatasetBodySchema = z.object({
  connector_id: z.string().min(1),
  count: z.coerce.number().min(5).max(50).optional().default(10),
});

export function registerGenerateEvalDatasetRoute({ router, logger }: AESOPRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/aesop/skills/{skillId}/generate-eval-dataset',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
      options: { timeout: { idleSocket: 120_000 } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(generateDatasetParamsSchema),
            body: buildRouteValidationWithZod(generateDatasetBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const { skillId } = request.params;
        const { connector_id: connectorId, count } = request.body;
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client;
        const evalsContext = await context.evals;

        try {
          // Load skill from .aesop-proposed-skills
          const skillDoc = await esClient.asCurrentUser.get({
            index: '.aesop-proposed-skills',
            id: skillId,
          });
          const skill = skillDoc._source as ProposedSkillDocument | undefined;
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

          // Generate test cases via LLM
          const generator = new SkillDatasetGenerator(logger);
          const testCases = await generator.generateTestCases(
            {
              id: skillId,
              name: skill.name,
              description: skill.description,
              markdown: skill.markdown,
            },
            { actionsClient, connectorId, count }
          );

          if (testCases.length === 0) {
            return response.customError({
              statusCode: 422,
              body: { message: 'LLM generated no valid test cases' },
            });
          }

          // Upsert dataset (idempotent — same skill always writes to same dataset)
          const datasetName = `aesop-skill-eval:${skillId}`;
          const datasetClient = evalsContext.datasetService.getClient(esClient.asCurrentUser);
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
          logger.error(`[AESOP] Failed to generate eval dataset: ${msg}`);
          const isConnectorIssue =
            /Connector execution failed|security token|Forbidden|Unauthorized|rate limit|max_tokens|anthropic_version/i.test(
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
