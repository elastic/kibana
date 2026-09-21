/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { ESCALATIONS_INTERNAL_URL } from '../../../common/escalations/constants';
import { createEscalationRequestSchema } from '../../../common/escalations/escalation';
import { ESCALATIONS_API_PRIVILEGE_MANAGE } from '../constants';
import type { EscalationRouteDependencies } from '../types';
import { handleEscalationRouteError } from './handle_route_error';

export const registerCreateEscalationRoute = ({
  router,
  logger,
  getEscalationsService,
}: EscalationRouteDependencies) => {
  router.versioned
    .post({
      path: ESCALATIONS_INTERNAL_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [ESCALATIONS_API_PRIVILEGE_MANAGE] } },
      summary: 'Create an escalation',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: { request: { body: buildRouteValidationWithZod(createEscalationRequestSchema) } },
      },
      async (_context, request, response) => {
        try {
          const escalation = await getEscalationsService().create(request, request.body);
          return response.ok({ body: escalation });
        } catch (error) {
          return handleEscalationRouteError(error, response, logger);
        }
      }
    );
};
