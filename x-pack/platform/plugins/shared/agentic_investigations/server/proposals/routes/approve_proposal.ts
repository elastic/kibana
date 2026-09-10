/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { PROPOSAL_APPROVE_URL } from '../../../common/proposals/constants';
import { approveProposalRequestSchema } from '../../../common/proposals/proposal';
import { PROPOSALS_API_PRIVILEGE_MANAGE } from '../constants';
import type { RouteDependencies } from '../types';
import { handleRouteError } from './handle_route_error';
import { INTERNAL_ACCESS, proposalIdParamsSchema } from './shared';

export const registerApproveProposalRoute = ({
  router,
  logger,
  getProposalsService,
  getSpaceId,
  resolveUser,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PROPOSAL_APPROVE_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_MANAGE] } },
      summary: 'Approve an investigation proposal',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(proposalIdParamsSchema),
            body: buildRouteValidationWithZod(approveProposalRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const proposal = await getProposalsService().approve(request.params.id, request.body, {
            spaceId: getSpaceId(request),
            request,
            user: await resolveUser(request),
          });
          return response.ok({ body: proposal });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
