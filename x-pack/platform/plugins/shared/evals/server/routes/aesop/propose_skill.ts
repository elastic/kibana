/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { API_VERSIONS, EVALS_INTERNAL_URL, INTERNAL_API_ACCESS } from '@kbn/evals-common';
import { buildRouteValidationWithZod } from '@kbn/evals-common';
import { PLUGIN_ID } from '../../../common';
import { SkillClient } from '../../storage/skill_client';
import type { AesopRouteDependencies } from '.';

const EVALS_SKILLS_URL = `${EVALS_INTERNAL_URL}/skills` as const;

const ProposeSkillRequestBody = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(256),
  description: z.string().max(2048),
  markdown: z.string().min(1),
  confidence: z.number().min(0).max(1),
  derived_from: z
    .enum(['patterns', 'relationships', 'conversations', 'llm', 'skill_improvement'])
    .optional(),
  variant_group_id: z.string().optional(),
  variant_label: z.string().optional(),
  metadata: z
    .object({
      created_at: z.string().optional(),
      exploration_execution_id: z.string().optional(),
      source_indices: z.array(z.string()).optional(),
    })
    .optional(),
});

export const registerProposeSkillRoute = ({ router, logger }: AesopRouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_SKILLS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Propose a new skill for evaluation',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(ProposeSkillRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const body = request.body;
          const coreContext = await context.core;
          const soClient = coreContext.savedObjects.client;
          const skillClient = new SkillClient(soClient);

          const so = await skillClient.create({
            id: body.id,
            name: body.name,
            description: body.description,
            markdown: body.markdown,
            confidence: body.confidence,
            derived_from: body.derived_from,
            variant_group_id: body.variant_group_id,
            variant_label: body.variant_label,
            metadata: {
              created_at: body.metadata?.created_at ?? new Date().toISOString(),
              exploration_execution_id: body.metadata?.exploration_execution_id,
              source_indices: body.metadata?.source_indices,
            },
          });

          const skill = skillClient.toDocument(so);

          return response.ok({ body: skill });
        } catch (error) {
          logger.error(`Failed to propose skill: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to propose skill' },
          });
        }
      }
    );
};
