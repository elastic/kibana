/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiPrivileges } from '@kbn/core-security-server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { IMPACT_PROPOSAL_PILLS_URL } from '../../../common/impact/constants';
import { proposalImpactPillsQuerySchema } from '../../../common/impact/impact_pills';
import type { ImpactPillsResponse } from '../../../common/impact/impact_pills';
import type { ImpactRouteDependencies } from '../types';
import { handleRouteError } from './handle_route_error';
import { INTERNAL_ACCESS } from './shared';

const PROPOSALS_API_PRIVILEGE_READ = ApiPrivileges.read('proposals');

export const registerGetProposalImpactPillsRoute = ({
  router,
  logger,
  getImpactPillsService,
}: ImpactRouteDependencies) => {
  router.versioned
    .get({
      path: IMPACT_PROPOSAL_PILLS_URL,
      access: INTERNAL_ACCESS,
      security: { authz: { requiredPrivileges: [PROPOSALS_API_PRIVILEGE_READ] } },
      summary: 'Get the impact entities across a proposal queue',
    })
    .addVersion(
      {
        version: AGENTIC_INVESTIGATIONS_API_VERSION,
        validate: {
          request: { query: buildRouteValidationWithZod(proposalImpactPillsQuerySchema) },
        },
      },
      async (_context, request, response) => {
        try {
          const pills = await getImpactPillsService().forProposals(request, request.query);
          const body: ImpactPillsResponse = { pills };
          return response.ok({ body });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
