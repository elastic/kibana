/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PROPOSALS_API_VERSION, PROPOSAL_REOPEN_URL } from '@kbn/proposals-common';
import { PROPOSALS_API_PRIVILEGE_MANAGE } from '../constants';
import type { RouteDependencies } from '../types';
import { handleRouteError } from './handle_route_error';
import { INTERNAL_ACCESS, proposalIdParamsSchema } from './shared';

/**
 * Marks a to-do proposal that was marked as applied as not applied, by re-offering it as a
 * pending successor. Responds with the successor's id once the gate has created it.
 */
export const registerReopenProposalRoute = ({
  router,
  logger,
  getProposalsService,
  getSpaceId,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PROPOSAL_REOPEN_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_MANAGE] } },
      summary: 'Mark a to-do proposal as not applied',
    })
    .addVersion(
      {
        version: PROPOSALS_API_VERSION,
        validate: {
          request: { params: buildRouteValidationWithZod(proposalIdParamsSchema) },
        },
      },
      async (_context, request, response) => {
        try {
          const result = await getProposalsService().reopen(
            request.params.id,
            getSpaceId(request),
            request
          );
          return response.ok({ body: result });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
