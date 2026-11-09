/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { ESCALATION_CLOSE_PREVIEW_URL } from '../../../common/escalations/constants';
import { assignConversationRequestParamsSchema } from '../../../common/assignments/assignment';
import { ESCALATIONS_API_PRIVILEGE_READ } from '../constants';
import type { EscalationRouteDependencies } from '../types';
import { handleEscalationRouteError } from './handle_route_error';

export const registerGetEscalationClosePreviewRoute = ({
  router,
  logger,
  getEscalationsService,
}: EscalationRouteDependencies) => {
  router.versioned
    .get({
      path: ESCALATION_CLOSE_PREVIEW_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [ESCALATIONS_API_PRIVILEGE_READ] } },
      summary: 'Preview what closing an escalation would affect',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(assignConversationRequestParamsSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const result = await getEscalationsService().getClosePreview(request, request.params.id);
          return response.ok({ body: result });
        } catch (error) {
          return handleEscalationRouteError(error, response, logger);
        }
      }
    );
};
