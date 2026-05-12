/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { API_VERSIONS, EVALS_INTERNAL_URL, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import { SkillClient } from '../../storage/skill_client';
import type { AesopRouteDependencies } from '.';

const EVALS_SKILL_URL = `${EVALS_INTERNAL_URL}/skills/{skillId}` as const;

const GetSkillRequestParams = z.object({
  skillId: z.string(),
});

export const registerGetSkillRoute = ({ router }: AesopRouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_SKILL_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Get a proposed skill by ID',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetSkillRequestParams),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { skillId } = request.params;
          const coreContext = await context.core;
          const soClient = coreContext.savedObjects.client;
          const skillClient = new SkillClient(soClient);

          const so = await skillClient.get(skillId);
          const skill = skillClient.toDocument(so);

          return response.ok({ body: skill });
        } catch (error) {
          if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
            return response.notFound({
              body: { message: `Skill not found: ${request.params.skillId}` },
            });
          }
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get skill' },
          });
        }
      }
    );
};
