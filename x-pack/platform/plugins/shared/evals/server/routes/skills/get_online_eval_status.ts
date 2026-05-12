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

const querySchema = z.object({
  run_id: z.string().optional(),
});

export const registerSkillGetOnlineEvalStatusRoute = ({
  router,
  skillOnlineEvalService,
}: SkillRouteDependencies) => {
  router.versioned
    .get({
      path: '/internal/evals/skills/{skillId}/online-eval-status',
      access: 'internal',
      security: { authz: { requiredPrivileges: ['evals'] } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(paramsSchema),
            query: buildRouteValidationWithZod(querySchema),
          },
        },
      },
      async (_context, request, response) => {
        if (!skillOnlineEvalService) {
          return response.ok({ body: { run: null } });
        }

        const { skillId } = request.params;
        const { run_id: runId } = request.query;

        const run = runId
          ? skillOnlineEvalService.getRun(runId)
          : skillOnlineEvalService.getLatestRun(skillId);

        return response.ok({ body: { run: run ?? null } });
      }
    );
};
