/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import {
  investigationStatusSchema,
  investigationSeveritySchema,
} from '../../../common/investigations/investigation';
import { handleRouteError } from './handle_route_error';
import {
  INTERNAL_ACCESS,
  INVESTIGATIONS_INTERNAL_URL,
  INVESTIGATIONS_READ_PRIVILEGE,
  type InvestigationsRouteDependencies,
} from './shared';

/**
 * `from + size` must stay within Elasticsearch's default result window of
 * 10,000. Deep paging past that needs `search_after`, which this list does not
 * expose yet.
 */
const listInvestigationsQuerySchema = z.object({
  status: investigationStatusSchema.optional(),
  severity: investigationSeveritySchema.optional(),
  impactedEntityName: z.string().max(512).optional(),
  from: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const registerListInvestigationsRoute = ({
  router,
  logger,
  getInvestigationsService,
  getSpaceId,
}: InvestigationsRouteDependencies) => {
  router.versioned
    .get({
      path: INVESTIGATIONS_INTERNAL_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [INVESTIGATIONS_READ_PRIVILEGE] } },
      summary: 'List investigations',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: { query: buildRouteValidationWithZod(listInvestigationsQuerySchema) },
        },
      },
      async (_context, request, response) => {
        try {
          const body = await getInvestigationsService().list(getSpaceId(request), request.query);
          return response.ok({ body });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
