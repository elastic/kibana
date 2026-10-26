/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { INVESTIGATIONS_SEVERITY_COUNTS_URL } from '../../../common/investigations/constants';
import { investigationFiltersSchema } from '../../../common/investigations/investigation';
import type { InvestigationRouteDependencies } from '../types';
import { handleInvestigationRouteError } from './handle_route_error';
import { INVESTIGATIONS_READ_AUTHZ } from './read_privileges';

export const registerGetSeverityCountsRoute = ({
  router,
  logger,
  getInvestigationsQueryService,
}: InvestigationRouteDependencies) => {
  router.versioned
    .get({
      path: INVESTIGATIONS_SEVERITY_COUNTS_URL,
      access: 'internal',
      security: INVESTIGATIONS_READ_AUTHZ,
      summary: 'Count investigations per severity',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: { query: buildRouteValidationWithZod(investigationFiltersSchema) },
        },
      },
      async (_context, request, response) => {
        try {
          const body = await getInvestigationsQueryService().severityCounts(request, request.query);
          return response.ok({ body });
        } catch (error) {
          return handleInvestigationRouteError(error, response, logger);
        }
      }
    );
};
