/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { AESOPRouteDependencies } from './register_aesop_routes';

const unrejectSkillParamsSchema = z.object({
  skillId: z.string().min(1),
});

export function registerUnrejectSkillRoute({ router, logger }: AESOPRouteDependencies) {
  router.versioned
    .post({
      path: '/internal/aesop/skills/{skillId}/unreject',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['evals'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(unrejectSkillParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        const { skillId } = request.params;

        try {
          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            doc: {
              review: {
                status: 'pending_review',
                restored_by: 'unknown',
                restored_at: new Date().toISOString(),
              },
            },
            refresh: 'wait_for',
          });

          logger.info(`[AESOP] Skill restored to pending review skill_id=${skillId}`);

          return response.ok({
            body: { success: true, skill_id: skillId },
          });
        } catch (error) {
          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to restore skill: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          });
        }
      }
    );
}
