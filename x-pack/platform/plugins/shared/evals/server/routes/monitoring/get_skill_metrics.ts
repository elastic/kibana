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
import type { MonitoringRouteDependencies } from '.';

const EVALS_SKILL_METRICS_URL = `${EVALS_INTERNAL_URL}/skills/{skillId}/metrics` as const;

const GetSkillMetricsParams = z.object({
  skillId: z.string(),
});

const GetSkillMetricsQuery = z.object({
  from: z.string(),
  to: z.string(),
  skill_name: z.string().optional(),
  deployed_at: z.string().optional(),
});

export const registerGetSkillMetricsRoute = ({
  router,
  logger,
  monitoringService,
}: MonitoringRouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_SKILL_METRICS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Get skill performance metrics',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetSkillMetricsParams),
            query: buildRouteValidationWithZod(GetSkillMetricsQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { skillId } = request.params;
          const { from, to, skill_name: skillName, deployed_at: deployedAt } = request.query;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const metrics = await monitoringService.getSkillMetrics(
            skillId,
            skillName ?? skillId,
            deployedAt ?? new Date().toISOString(),
            { from, to },
            esClient
          );

          return response.ok({ body: metrics });
        } catch (error) {
          logger.error(`Failed to get skill metrics: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get skill metrics' },
          });
        }
      }
    );
};
