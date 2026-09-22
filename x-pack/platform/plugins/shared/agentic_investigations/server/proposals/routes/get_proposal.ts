/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { PROPOSAL_BY_ID_URL } from '../../../common/proposals/constants';
import { PROPOSALS_API_PRIVILEGE_READ } from '../constants';
import type { RouteDependencies } from '../types';
import { handleRouteError } from './handle_route_error';
import { INTERNAL_ACCESS, proposalIdParamsSchema } from './shared';

export const registerGetProposalRoute = ({
  router,
  logger,
  getProposalsService,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PROPOSAL_BY_ID_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_READ] } },
      summary: 'Get an investigation proposal',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: { request: { params: buildRouteValidationWithZod(proposalIdParamsSchema) } },
      },
      async (_context, request, response) => {
        try {
          const body = await getProposalsService().get(request.params.id, getSpaceId(request));
          return response.ok({ body });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
