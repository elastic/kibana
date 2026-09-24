/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { INVESTIGATION_ASSIGN_URL } from '../../../common/investigations/constants';
import { INVESTIGATION_TEMPLATE_ID } from '../../../common/escalations/constants';
import {
  assignConversationRequestBodySchema,
  assignConversationRequestParamsSchema,
} from '../../../common/assignments/assignment';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../constants';
import type { InvestigationRouteDependencies } from '../types';
import { handleInvestigationRouteError } from './handle_route_error';

export const registerAssignInvestigationRoute = ({
  router,
  logger,
  getAssignmentsService,
}: InvestigationRouteDependencies) => {
  router.versioned
    .put({
      path: INVESTIGATION_ASSIGN_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [INVESTIGATIONS_API_PRIVILEGE_MANAGE] } },
      summary: 'Assign users to an investigation',
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
            expectedTemplate: INVESTIGATION_TEMPLATE_ID,
          });
          return response.ok({ body: conversation });
        } catch (error) {
          return handleInvestigationRouteError(error, response, logger);
        }
      }
    );
};
