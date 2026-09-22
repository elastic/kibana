/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { PROPOSAL_REVISIONS_URL } from '../../../common/proposals/constants';
import { reviseProposalRequestSchema } from '../../../common/proposals/revision';
import { PROPOSALS_API_PRIVILEGE_MANAGE } from '../constants';
import type { RouteDependencies } from '../types';
import { handleRouteError } from './handle_route_error';
import { INTERNAL_ACCESS, reviseProposalParamsSchema } from './shared';

/**
 * Sub-resource creation rather than a verb: the result is a new proposal.
 * Unlike approve/dismiss this route writes directly — the gate belongs to the
 * chain, so it stays parked however many revisions are appended under it.
 */
export const registerReviseProposalRoute = ({
  router,
  logger,
  getProposalsService,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PROPOSAL_REVISIONS_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_MANAGE] } },
      summary: 'Revise an investigation proposal',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(reviseProposalParamsSchema),
            body: buildRouteValidationWithZod(reviseProposalRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const { proposalId, revision } = await getProposalsService().revise(
            { id: request.params.proposalId, ...request.body },
            getSpaceId(request),
            request
          );

          return response.ok({ body: { proposalId, revision, status: 'pending' } });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
