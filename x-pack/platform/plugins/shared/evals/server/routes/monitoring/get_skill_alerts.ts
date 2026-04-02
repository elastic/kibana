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

const EVALS_SKILL_ALERTS_URL = `${EVALS_INTERNAL_URL}/skills/{skillId}/alerts` as const;

const GetSkillAlertsParams = z.object({
  skillId: z.string(),
});

export const registerGetSkillAlertsRoute = ({
  router,
  logger,
  monitoringService,
}: MonitoringRouteDependencies) => {
  router.versioned
    .get({
      path: EVALS_SKILL_ALERTS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Get active alerts for a skill',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetSkillAlertsParams),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { skillId } = request.params;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const now = new Date();
          const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const to = now.toISOString();

          const metrics = await monitoringService.getSkillMetrics(
            skillId,
            skillId,
            new Date().toISOString(),
            { from, to },
            esClient
          );

          return response.ok({ body: { alerts: metrics.alerts } });
        } catch (error) {
          logger.error(`Failed to get skill alerts: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to get skill alerts' },
          });
        }
      }
    );
};
