/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { ESCALATION_SYNC_URL } from '../../../common/escalations/constants';
import { ESCALATIONS_API_PRIVILEGE_MANAGE } from '../constants';
import type { EscalationRouteDependencies } from '../types';
import { handleEscalationRouteError } from './handle_route_error';
import { escalationIdParamsSchema } from './shared';

export const registerSyncEscalationRoute = ({
  router,
  logger,
  getEscalationsService,
}: EscalationRouteDependencies) => {
  router.versioned
    .post({
      path: ESCALATION_SYNC_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [ESCALATIONS_API_PRIVILEGE_MANAGE] } },
      summary: "Sync an escalation's attachments with its linked investigations",
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: { request: { params: buildRouteValidationWithZod(escalationIdParamsSchema) } },
      },
      async (_context, request, response) => {
        try {
          const body = await getEscalationsService().sync(request, request.params.id);
          return response.ok({ body });
        } catch (error) {
          return handleEscalationRouteError(error, response, logger);
        }
      }
    );
};
