/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { SkillRouteDependencies } from '.';

const paramsSchema = z.object({ skillId: z.string() });

export function registerSkillGetDatasetStatusRoute({ router, logger }: SkillRouteDependencies) {
  router.versioned
    .get({
      path: '/internal/evals/skills/{skillId}/dataset-status',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(paramsSchema),
          },
        },
      },
      async (context, request, response) => {
        const { skillId } = request.params;
        const evalsContext = await context.evals;

        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;
          const datasetClient = evalsContext.datasetService.getClient(esClient);
          const datasetName = `skill-eval:${skillId}`;

          const dataset = await datasetClient.getByName(datasetName);

          if (!dataset) {
            return response.ok({
              body: {
                exists: false,
                dataset_name: datasetName,
                examples_count: 0,
              },
            });
          }

          return response.ok({
            body: {
              exists: true,
              dataset_id: dataset.id,
              dataset_name: datasetName,
              examples_count: dataset.examples?.length ?? 0,
            },
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error(`[Evals] Failed to get dataset status: ${msg}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to get dataset status: ${msg}` },
          });
        }
      }
    );
}
