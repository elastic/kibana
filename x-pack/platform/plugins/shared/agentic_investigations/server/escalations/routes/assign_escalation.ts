/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import {
  ESCALATION_ASSIGN_URL,
  ESCALATION_TEMPLATE_ID,
} from '../../../common/escalations/constants';
import {
  assignConversationRequestBodySchema,
  assignConversationRequestParamsSchema,
} from '../../../common/assignments/assignment';
import { ESCALATIONS_API_PRIVILEGE_MANAGE } from '../constants';
import type { EscalationRouteDependencies } from '../types';
import { handleEscalationRouteError } from './handle_route_error';

export const registerAssignEscalationRoute = ({
  router,
  logger,
  getAssignmentsService,
}: EscalationRouteDependencies) => {
  router.versioned
    .put({
      path: ESCALATION_ASSIGN_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [ESCALATIONS_API_PRIVILEGE_MANAGE] } },
      summary: 'Assign users to an escalation',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(assignConversationRequestParamsSchema),
            body: buildRouteValidationWithZod(assignConversationRequestBodySchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const conversation = await getAssignmentsService().assign({
            request,
            conversationId: request.params.id,
            assignees: request.body.assignees,
            expectedTemplate: ESCALATION_TEMPLATE_ID,
          });
          return response.ok({ body: conversation });
        } catch (error) {
          return handleEscalationRouteError(error, response, logger);
        }
      }
    );
};
