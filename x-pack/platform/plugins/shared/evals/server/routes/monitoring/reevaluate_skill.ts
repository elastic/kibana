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

const EVALS_SKILL_REEVALUATE_URL = `${EVALS_INTERNAL_URL}/skills/{skillId}/reevaluate` as const;

const ReEvaluateParams = z.object({
  skillId: z.string(),
});

const ReEvaluateBody = z.object({
  dataset_id: z.string(),
  evaluators: z.array(z.string()).min(1),
  connector_id: z.string(),
});

export const registerReEvaluateSkillRoute = ({
  router,
  logger,
  monitoringService,
  evaluatorRegistry,
}: MonitoringRouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_SKILL_REEVALUATE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Re-evaluate a deployed skill',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(ReEvaluateParams),
            body: buildRouteValidationWithZod(ReEvaluateBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { skillId } = request.params;
          const { dataset_id: datasetId, evaluators, connector_id: connectorId } = request.body;
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          const result = await monitoringService.reEvaluateSkill(
            skillId,
            datasetId,
            evaluators,
            connectorId,
            { evaluatorRegistry, esClient }
          );

          return response.ok({ body: result });
        } catch (error) {
          logger.error(`Failed to re-evaluate skill: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to re-evaluate skill' },
          });
        }
      }
    );
};
