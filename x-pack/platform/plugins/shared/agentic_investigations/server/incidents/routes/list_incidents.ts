/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { INCIDENTS_INTERNAL_URL } from '../../../common/incidents/constants';
import { listIncidentsQuerySchema } from '../../../common/incidents/incident';
import { INCIDENTS_API_PRIVILEGE_READ } from '../constants';
import type { IncidentRouteDependencies } from '../types';
import { handleIncidentRouteError } from './handle_route_error';
import { INTERNAL_ACCESS } from './shared';

export const registerListIncidentsRoute = ({
  router,
  logger,
  getIncidentsService,
}: IncidentRouteDependencies) => {
  router.versioned
    .get({
      path: INCIDENTS_INTERNAL_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [INCIDENTS_API_PRIVILEGE_READ] } },
      summary: 'List incidents',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: { request: { query: buildRouteValidationWithZod(listIncidentsQuerySchema) } },
      },
      async (_context, request, response) => {
        try {
          const body = await getIncidentsService().list(request, request.query);
          return response.ok({ body });
        } catch (error) {
          return handleIncidentRouteError(error, response, logger);
        }
      }
    );
};
