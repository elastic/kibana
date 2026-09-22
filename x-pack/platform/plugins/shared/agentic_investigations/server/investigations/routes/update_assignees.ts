/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { INVESTIGATION_ASSIGNEES_URL } from '../../../common/investigations/constants';
import {
  investigationIdParamsSchema,
  updateAssigneesRequestSchema,
} from '../../../common/investigations/investigation';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../constants';
import type { InvestigationRouteDependencies } from '../types';
import { handleInvestigationRouteError } from './handle_route_error';

export const registerUpdateAssigneesRoute = ({
  router,
  logger,
  getInvestigationsService,
}: InvestigationRouteDependencies) => {
  router.versioned
    .patch({
      path: INVESTIGATION_ASSIGNEES_URL,
      access: 'internal',
      security: { authz: { requiredPrivileges: [INVESTIGATIONS_API_PRIVILEGE_MANAGE] } },
      summary: 'Update the assignees of an investigation',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(investigationIdParamsSchema),
            body: buildRouteValidationWithZod(updateAssigneesRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const result = await getInvestigationsService().updateAssignees(
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
