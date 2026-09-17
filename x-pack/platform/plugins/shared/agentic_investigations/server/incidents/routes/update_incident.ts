/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { INCIDENT_BY_ID_URL } from '../../../common/incidents/constants';
import { updateIncidentRequestSchema } from '../../../common/incidents/incident';
import { INCIDENTS_API_PRIVILEGE_MANAGE } from '../constants';
import type { IncidentRouteDependencies } from '../types';
import { handleIncidentRouteError } from './handle_route_error';
import { incidentIdParamsSchema } from './shared';

export const registerUpdateIncidentRoute = ({
  router,
  logger,
  getIncidentsService,
}: IncidentRouteDependencies) => {
  router.versioned
    .patch({
      path: INCIDENT_BY_ID_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [INCIDENTS_API_PRIVILEGE_MANAGE] } },
      summary: 'Update an incident title or linked investigations',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(incidentIdParamsSchema),
            body: buildRouteValidationWithZod(updateIncidentRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const incident = await getIncidentsService().update(
            request,
            request.params.id,
            request.body
          );
          return response.ok({ body: incident });
        } catch (error) {
          return handleIncidentRouteError(error, response, logger);
        }
      }
    );
};
