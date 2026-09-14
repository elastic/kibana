/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { handleRouteError } from './handle_route_error';
import {
  INTERNAL_ACCESS,
  INVESTIGATIONS_BY_ID_URL,
  INVESTIGATIONS_READ_PRIVILEGE,
  investigationIdParamsSchema,
  type InvestigationsRouteDependencies,
} from './shared';

export const registerGetInvestigationRoute = ({
  router,
  logger,
  getInvestigationsService,
  getSpaceId,
}: InvestigationsRouteDependencies) => {
  router.versioned
    .get({
      path: INVESTIGATIONS_BY_ID_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [INVESTIGATIONS_READ_PRIVILEGE] } },
      summary: 'Get an investigation',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: { params: buildRouteValidationWithZod(investigationIdParamsSchema) },
        },
      },
      async (_context, request, response) => {
        try {
          const body = await getInvestigationsService().get(getSpaceId(request), request.params.id);
          if (!body) {
            return response.notFound();
          }
          return response.ok({ body });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
