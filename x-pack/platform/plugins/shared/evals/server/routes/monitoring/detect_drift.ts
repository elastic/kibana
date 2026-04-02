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

const EVALS_SKILL_DRIFT_URL = `${EVALS_INTERNAL_URL}/skills/{skillId}/drift-check` as const;

const DetectDriftParams = z.object({
  skillId: z.string(),
});

const DetectDriftBody = z.object({
  deployment_score: z.number().min(0).max(1),
  threshold: z.number().min(0).max(1).optional(),
  evaluation_interval: z.string().optional(),
});

export const registerDetectDriftRoute = ({
  router,
  logger,
  monitoringService,
}: MonitoringRouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_SKILL_DRIFT_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Check for skill score drift',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(DetectDriftParams),
            body: buildRouteValidationWithZod(DetectDriftBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { skillId } = request.params;
          const {
            deployment_score: deploymentScore,
            threshold,
            evaluation_interval: evaluationInterval,
          } = request.body;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const result = await monitoringService.detectDrift(skillId, deploymentScore, esClient, {
            threshold: threshold ?? 0.1,
            evaluationInterval: evaluationInterval ?? '24h',
            enabled: true,
          });

          return response.ok({ body: result });
        } catch (error) {
          logger.error(`Failed to detect drift: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to detect drift' },
          });
        }
      }
    );
};
