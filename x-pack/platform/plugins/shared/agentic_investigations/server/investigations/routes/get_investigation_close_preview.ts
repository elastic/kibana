/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { INVESTIGATION_CLOSE_PREVIEW_URL } from '../../../common/investigations/constants';
import { assignConversationRequestParamsSchema } from '../../../common/assignments/assignment';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../constants';
import type { InvestigationRouteDependencies } from '../types';
import { handleInvestigationRouteError } from './handle_route_error';

export const registerGetInvestigationClosePreviewRoute = ({
  router,
  logger,
  getInvestigationStatusService,
}: InvestigationRouteDependencies) => {
  router.versioned
    .get({
      path: INVESTIGATION_CLOSE_PREVIEW_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [INVESTIGATIONS_API_PRIVILEGE_MANAGE] } },
      summary: 'Preview what closing an investigation would affect',
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
          const result = await getInvestigationStatusService!().getPreview(
            request,
            request.params.id
          );
          return response.ok({ body: result });
        } catch (error) {
          return handleInvestigationRouteError(error, response, logger);
        }
      }
    );
};
