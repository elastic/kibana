/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PROPOSALS_API_VERSION } from '@kbn/proposals-common';
import { PROPOSAL_APPROVE_URL } from '@kbn/proposals-common';
import { approveProposalRequestSchema } from '@kbn/proposals-common';
import { PROPOSALS_API_PRIVILEGE_MANAGE } from '../constants';
import type { RouteDependencies } from '../types';
import { handleRouteError } from './handle_route_error';
import { INTERNAL_ACCESS, proposalIdParamsSchema } from './shared';

/**
 * A privilege-checked bridge to the gate, not the decision itself.
 *
 * `requiredPrivileges` is what answers "may this caller decide?", and it is the
 * only place a human can actually be told no — synchronously, as a 403. The
 * decision is then written by the gate workflow's post-gate steps, so this
 * route performs no writes and the record still reads undecided when it
 * responds. Callers must refetch rather than trust the response body.
 */
export const registerApproveProposalRoute = ({
  router,
  logger,
  getProposalsService,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PROPOSAL_APPROVE_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_MANAGE] } },
      summary: 'Approve a proposal',
    })
    .addVersion(
      {
        version: PROPOSALS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(proposalIdParamsSchema),
            body: buildRouteValidationWithZod(approveProposalRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          // `waitForApproval` reduces its resume payload to a bare boolean, so
          // the rationale cannot reach the workflow through the gate and the
          // service writes it on the way past — after every refusal, so a
          // rejected approval leaves the record untouched.
          const proposal = await getProposalsService().releaseGate(request.params.id, {
            approved: true,
            actionInput: request.body.actionInput,
            rationale: request.body.rationale,
            spaceId: getSpaceId(request),
            request,
          });

          return response.ok({ body: proposal });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
