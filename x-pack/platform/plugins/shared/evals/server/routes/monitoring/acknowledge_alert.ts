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

const EVALS_SKILL_ALERT_ACK_URL =
  `${EVALS_INTERNAL_URL}/skills/{skillId}/alerts/{alertId}/acknowledge` as const;

const AcknowledgeAlertParams = z.object({
  skillId: z.string(),
  alertId: z.string(),
});

export const registerAcknowledgeAlertRoute = ({ router }: MonitoringRouteDependencies) => {
  router.versioned
    .post({
      path: EVALS_SKILL_ALERT_ACK_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PLUGIN_ID] },
      },
      summary: 'Acknowledge a skill alert',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(AcknowledgeAlertParams),
          },
        },
      },
      async (_context, _request, response) => {
        return response.customError({
          statusCode: 501,
          body: { message: 'Alert acknowledgement persistence is not yet implemented' },
        });
      }
    );
};
