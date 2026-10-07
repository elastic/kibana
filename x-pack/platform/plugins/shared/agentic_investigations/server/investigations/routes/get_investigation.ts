/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { INVESTIGATION_BY_ID_URL } from '../../../common/investigations/constants';
import { investigationIdParamsSchema } from '../../../common/investigations/investigation';
import type { InvestigationRouteDependencies } from '../types';
import { handleInvestigationRouteError } from './handle_route_error';
import { INVESTIGATIONS_READ_AUTHZ } from './read_privileges';

export const registerGetInvestigationRoute = ({
  router,
  logger,
  getInvestigationsQueryService,
}: InvestigationRouteDependencies) => {
  router.versioned
    .get({
      path: INVESTIGATION_BY_ID_URL,
      access: 'internal',
      security: INVESTIGATIONS_READ_AUTHZ,
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
          const body = await getInvestigationsQueryService().get(request, request.params.id);
          return response.ok({ body });
        } catch (error) {
          return handleInvestigationRouteError(error, response, logger);
        }
      }
    );
};
