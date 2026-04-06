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

const getSkillDetailParamsSchema = z.object({
  skillId: z.string().min(1),
});

export function registerGetSkillDetailRoute({ router, logger }: AESOPRouteDependencies) {
  router.versioned
    .get({
      path: '/internal/aesop/skills/{skillId}',
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
            params: buildRouteValidationWithZod(getSkillDetailParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;
        const { skillId } = request.params;

        try {
          const doc = await esClient.get<ProposedSkillDocument>({
            index: '.aesop-proposed-skills',
            id: skillId,
          });

          if (!doc._source) {
            return response.notFound({
              body: { message: `Skill ${skillId} not found or source unavailable` },
            });
          }

          return response.ok({
            body: {
              id: doc._id,
              ...doc._source,
            },
          });
        } catch (error: unknown) {
          if (
            error instanceof Error &&
            (error as Error & { meta?: { statusCode?: number } }).meta?.statusCode === 404
          ) {
            return response.notFound({ body: { message: `Skill ${skillId} not found` } });
          }
          logger.error(
            `[AESOP] Failed to get skill detail skill_id=${skillId} error=${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to get skill: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          });
        }
      }
    );
}
