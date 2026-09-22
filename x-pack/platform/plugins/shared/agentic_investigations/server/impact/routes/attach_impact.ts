/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { IMPACT_INTERNAL_URL } from '../../../common/impact/constants';
import { attachImpactRequestSchema } from '../../../common/impact/impact';
import { IMPACT_API_PRIVILEGE_MANAGE } from '../constants';
import type { ImpactRouteDependencies } from '../types';
import { handleRouteError } from './handle_route_error';
import { INTERNAL_ACCESS } from './shared';

export const registerAttachImpactRoute = ({
  router,
  logger,
  getImpactService,
  getSpaceId,
  resolveUser,
}: ImpactRouteDependencies) => {
  router.versioned
    .post({
      path: IMPACT_INTERNAL_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [IMPACT_API_PRIVILEGE_MANAGE] } },
      summary: 'Attach entities to an investigation impact',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: { request: { body: buildRouteValidationWithZod(attachImpactRequestSchema) } },
      },
      async (_context, request, response) => {
        try {
          const body = await getImpactService().attach(request.body, {
            spaceId: getSpaceId(request),
            user: await resolveUser(request),
          });
          return response.ok({ body });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
