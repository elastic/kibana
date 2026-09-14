/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { PROPOSALS_INTERNAL_URL } from '../../../common/proposals/constants';
import { createProposalRequestSchema } from '../../../common/proposals/proposal';
import { PROPOSALS_API_PRIVILEGE_MANAGE } from '../constants';
import type { RouteDependencies } from '../types';
import { handleRouteError } from './handle_route_error';
import { INTERNAL_ACCESS } from './shared';

export const registerCreateProposalRoute = ({
  router,
  logger,
  getProposalsService,
  getSpaceId,
  resolveUser,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PROPOSALS_INTERNAL_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_MANAGE] } },
      summary: 'Create an investigation proposal',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: { request: { body: buildRouteValidationWithZod(createProposalRequestSchema) } },
      },
      async (_context, request, response) => {
        try {
          const proposal = await getProposalsService().create(request.body, {
            spaceId: getSpaceId(request),
            user: await resolveUser(request),
          });
          return response.ok({ body: proposal });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
