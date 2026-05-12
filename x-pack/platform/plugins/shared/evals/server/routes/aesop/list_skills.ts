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

const VALID_STATUSES = ['pending', 'validating', 'passed', 'failed'] as const;

const ListSkillsRequestQuery = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  derived_from: z.string().optional(),
  variant_group_id: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  per_page: z.coerce.number().min(1).max(100).optional(),
});

export const registerListSkillsRoute = ({ router }: AesopRouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_SKILLS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'List proposed skills',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(ListSkillsRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const {
            status,
            derived_from: derivedFrom,
            variant_group_id: variantGroupId,
            page,
            per_page: perPage,
          } = request.query;

          const coreContext = await context.core;
          const soClient = coreContext.savedObjects.client;
          const skillClient = new SkillClient(soClient);

          const findResult = await skillClient.find({
            status,
            derivedFrom,
            variantGroupId,
            page,
            perPage,
          });

          const skills = findResult.saved_objects.map((so) => skillClient.toDocument(so));

          return response.ok({
            body: {
              skills,
              total: findResult.total,
              page: findResult.page,
              per_page: findResult.per_page,
            },
          });
        } catch (error) {
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list skills' },
          });
        }
      }
    );
};
