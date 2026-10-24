/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { INVESTIGATIONS_SECTION_COUNTS_URL } from '../../../common/investigations/constants';
import { investigationSectionCountsQuerySchema } from '../../../common/investigations/investigation';
import type { InvestigationRouteDependencies } from '../types';
import { handleInvestigationRouteError } from './handle_route_error';
import { INVESTIGATIONS_READ_AUTHZ } from './read_privileges';

export const registerGetSectionCountsRoute = ({
  router,
  logger,
  getSectionCountsService,
}: InvestigationRouteDependencies) => {
  router.versioned
    .get({
      path: INVESTIGATIONS_SECTION_COUNTS_URL,
      access: 'internal',
      security: INVESTIGATIONS_READ_AUTHZ,
      summary: 'Count investigations per status and severity, with and without a text query',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            query: buildRouteValidationWithZod(investigationSectionCountsQuerySchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const body = await getSectionCountsService().count(request, request.query);
          return response.ok({ body });
        } catch (error) {
          return handleInvestigationRouteError(error, response, logger);
        }
      }
    );
};
