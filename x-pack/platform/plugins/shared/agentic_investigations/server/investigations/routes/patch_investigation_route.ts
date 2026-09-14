/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { investigationSchema } from '../../../common/investigations/investigation';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { handleRouteError } from './handle_route_error';
import {
  INTERNAL_ACCESS,
  INVESTIGATIONS_BY_ID_URL,
  INVESTIGATIONS_MANAGE_PRIVILEGE,
  investigationIdParamsSchema,
  type InvestigationsRouteDependencies,
} from './shared';

/** Partial update body: all investigationSchema fields except identity fields are optional. */
const investigationPatchSchema = investigationSchema
  .omit({ id: true, spaceId: true, createdAt: true })
  .partial();

export const registerPatchInvestigationRoute = ({
  router,
  logger,
  getInvestigationsService,
  getSpaceId,
}: InvestigationsRouteDependencies) => {
  router.versioned
    .patch({
      path: INVESTIGATIONS_BY_ID_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [INVESTIGATIONS_MANAGE_PRIVILEGE] } },
      summary: 'Partially update an investigation',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(investigationIdParamsSchema),
            body: buildRouteValidationWithZod(investigationPatchSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const investigation = await getInvestigationsService().patch(
            request.params.id,
            getSpaceId(request),
            request.body
          );
          return response.ok({ body: investigation });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
