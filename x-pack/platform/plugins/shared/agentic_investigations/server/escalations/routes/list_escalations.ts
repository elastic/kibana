/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { ESCALATIONS_INTERNAL_URL } from '../../../common/escalations/constants';
import { listEscalationsQuerySchema } from '../../../common/escalations/escalation';
import { ESCALATIONS_API_PRIVILEGE_READ } from '../constants';
import type { EscalationRouteDependencies } from '../types';
import { handleEscalationRouteError } from './handle_route_error';

export const registerListEscalationsRoute = ({
  router,
  logger,
  getEscalationsService,
}: EscalationRouteDependencies) => {
  router.versioned
    .get({
      path: ESCALATIONS_INTERNAL_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [ESCALATIONS_API_PRIVILEGE_READ] } },
      summary: 'List escalations',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: { request: { query: buildRouteValidationWithZod(listEscalationsQuerySchema) } },
      },
      async (_context, request, response) => {
        try {
          const body = await getEscalationsService().list(request, request.query);
          return response.ok({ body });
        } catch (error) {
          return handleEscalationRouteError(error, response, logger);
        }
      }
    );
};
