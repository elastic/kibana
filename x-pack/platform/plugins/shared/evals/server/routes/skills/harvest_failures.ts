/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { SkillRouteDependencies } from '.';
import {
  harvestRegressionCases,
  createRegressionDatasetExamples,
} from '../../lib/aesop/failure_harvester';

const paramsSchema = z.object({ skillId: z.string() });

const bodySchema = z.object({
  min_count: z.number().min(1).optional().default(3),
  time_range: z.string().optional().default('7d'),
});

export function registerHarvestFailuresRoute({ router, logger }: SkillRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/evals/skills/{skillId}/harvest-failures',
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
        const { min_count: minCount, time_range: timeRange } = request.body;
        const evalsContext = await context.evals;

        try {
          // Validate skill exists
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

          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          // Harvest regression cases
          const cases = await harvestRegressionCases(esClient, skillId, {
            minCount,
            timeRange,
          });

          if (cases.length === 0) {
            return response.ok({
              body: {
                skill_id: skillId,
                harvested_count: 0,
                new_examples_created: 0,
                failure_patterns: [],
              },
            });
          }

          // Create regression dataset examples
          const datasetClient = evalsContext.datasetService.getClient(esClient);
          const { added } = await createRegressionDatasetExamples(datasetClient, skillId, cases);

          logger.info(
            `[Evals] Harvested ${cases.length} failure patterns for skill "${skillId}", created ${added} regression examples`
          );

          return response.ok({
            body: {
              skill_id: skillId,
              harvested_count: cases.length,
              new_examples_created: added,
              failure_patterns: cases,
            },
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error(`[Evals] Failed to harvest failures for skill "${skillId}": ${msg}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to harvest failures: ${msg}` },
          });
        }
      }
    );
}
