/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PROPOSALS_API_VERSION } from '@kbn/proposals-common';
import { PROPOSAL_DISMISS_URL } from '@kbn/proposals-common';
import { dismissProposalRequestSchema } from '@kbn/proposals-common';
import { PROPOSALS_API_PRIVILEGE_MANAGE } from '../constants';
import type { RouteDependencies } from '../types';
import { handleRouteError } from './handle_route_error';
import { INTERNAL_ACCESS, proposalIdParamsSchema } from './shared';

/**
 * Same bridge as approve, down the gate's negative branch, plus the annotation
 * the gate cannot carry. See `approve_proposal.ts` for why the decision itself
 * lands asynchronously.
 */
export const registerDismissProposalRoute = ({
  router,
  logger,
  getProposalsService,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PROPOSAL_DISMISS_URL,
      // Dismissing suppresses a recommendation and releases the waiting
      // worker, so it is gated exactly like approval.
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_MANAGE] } },
      summary: 'Dismiss a proposal',
    })
    .addVersion(
      {
        version: PROPOSALS_API_VERSION,
        validate: {
          request: {
            params: buildRouteValidationWithZod(proposalIdParamsSchema),
            body: buildRouteValidationWithZod(dismissProposalRequestSchema),
          },
        },
      },
      async (_context, request, response) => {
        try {
          // The reason is why this route writes at all: the gate would discard
          // it, and a dismissal without one tells an analyst nothing.
          const proposal = await getProposalsService().releaseGate(request.params.id, {
            approved: false,
            dismissReason: request.body.dismissReason,
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
