/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import type { AESOPRouteDependencies } from './register_aesop_routes';

const updateSkillParamsSchema = z.object({
  skillId: z.string().min(1),
});

const updateSkillBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  markdown: z.string().min(1).optional(),
});

export function registerUpdateSkillRoute({ router, logger }: AESOPRouteDependencies) {
  router.versioned
    .put({
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
            params: buildRouteValidationWithZod(updateSkillParamsSchema),
            body: buildRouteValidationWithZod(updateSkillBodySchema),
          },
        },
      },
      async (context, request, response) => {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        const { skillId } = request.params;
        const { name, description, markdown } = request.body;

        try {
          // Build partial update
          const updates: Record<string, unknown> = {};
          if (name !== undefined) updates.name = name;
          if (description !== undefined) updates.description = description;
          if (markdown !== undefined) updates.markdown = markdown;

          if (Object.keys(updates).length === 0) {
            return response.badRequest({ body: { message: 'No fields to update' } });
          }

          // Add edit metadata
          updates.last_edited_at = new Date().toISOString();
          updates.last_edited_by = 'unknown';

          // Reset validation when content changes — edits require re-validation
          if (markdown !== undefined) {
            updates.validation = {
              status: 'pending',
            };
          }

          await esClient.update({
            index: '.aesop-proposed-skills',
            id: skillId,
            doc: updates,
            refresh: 'wait_for',
          });

          logger.info(
            `[AESOP] Skill updated skill_id=${skillId} fields_updated=${Object.keys(updates).join(
              ','
            )}`
          );

          return response.ok({
            body: {
              success: true,
              skill_id: skillId,
              fields_updated: Object.keys(updates),
              validation_reset: markdown !== undefined,
            },
          });
        } catch (error) {
          logger.error(
            `[AESOP] Failed to update skill skill_id=${skillId} error=${
              error instanceof Error ? error.message : String(error)
            }`
          );

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to update skill: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          });
        }
      }
    );
}
