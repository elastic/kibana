/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { investigationSchema } from '../../../common/investigations/investigation';
import { handleRouteError } from './handle_route_error';
import {
  INTERNAL_ACCESS,
  INVESTIGATIONS_INTERNAL_URL,
  INVESTIGATIONS_MANAGE_PRIVILEGE,
  type InvestigationsRouteDependencies,
} from './shared';

export const registerUpsertInvestigationRoute = ({
  router,
  logger,
  getInvestigationsService,
  getSpaceId,
}: InvestigationsRouteDependencies) => {
  router.versioned
    .post({
      path: INVESTIGATIONS_INTERNAL_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [INVESTIGATIONS_MANAGE_PRIVILEGE] } },
      summary: 'Create or update an investigation',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: { request: { body: buildRouteValidationWithZod(investigationSchema) } },
      },
      async (_context, request, response) => {
        try {
          const { id: _id, ...doc } = request.body;
          const investigation = await getInvestigationsService().upsert(getSpaceId(request), doc);
          return response.ok({ body: investigation });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
