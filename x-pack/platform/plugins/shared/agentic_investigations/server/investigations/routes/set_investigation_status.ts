/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { INVESTIGATION_STATUS_URL } from '../../../common/investigations/constants';
import { setInvestigationStatusRequestSchema } from '../../../common/investigations/status';
import { assignConversationRequestParamsSchema } from '../../../common/assignments/assignment';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../constants';
import type { InvestigationRouteDependencies } from '../types';
import { handleInvestigationRouteError } from './handle_route_error';

export const registerSetInvestigationStatusRoute = ({
  router,
  logger,
  getInvestigationStatusService,
}: InvestigationRouteDependencies) => {
  router.versioned
    .put({
      path: INVESTIGATION_STATUS_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [INVESTIGATIONS_API_PRIVILEGE_MANAGE] } },
      summary: 'Open or close an investigation',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(assignConversationRequestParamsSchema),
            body: buildRouteValidationWithZod(setInvestigationStatusRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const result = await getInvestigationStatusService!().setStatus(
            request,
            request.params.id,
            request.body
          );
          return response.ok({ body: result });
        } catch (error) {
          return handleInvestigationRouteError(error, response, logger);
        }
      }
    );
};
