/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { ESCALATION_STATUS_URL } from '../../../common/escalations/constants';
import { setEscalationStatusRequestSchema } from '../../../common/investigations/status';
import { assignConversationRequestParamsSchema } from '../../../common/assignments/assignment';
import { ESCALATIONS_API_PRIVILEGE_MANAGE } from '../constants';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../../investigations/constants';
import type { EscalationRouteDependencies } from '../types';
import { handleEscalationRouteError } from './handle_route_error';

export const registerSetEscalationStatusRoute = ({
  router,
  logger,
  getEscalationsService,
}: EscalationRouteDependencies) => {
  router.versioned
    .put({
      path: ESCALATION_STATUS_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [
            ESCALATIONS_API_PRIVILEGE_MANAGE,
            INVESTIGATIONS_API_PRIVILEGE_MANAGE,
          ],
        },
      },
      summary: 'Open or close an escalation',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(assignConversationRequestParamsSchema),
            body: buildRouteValidationWithZod(setEscalationStatusRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const result = await getEscalationsService().setStatus(
            request,
            request.params.id,
            request.body
          );
          return response.ok({ body: result });
        } catch (error) {
          return handleEscalationRouteError(error, response, logger);
        }
      }
    );
};
