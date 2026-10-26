/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiPrivileges } from '@kbn/core-security-server';
import { proposalOriginSchema } from '@kbn/proposals-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common/constants';
import { IMPACT_PROPOSAL_SUMMARY_URL } from '../../../common/impact/constants';
import type { ImpactPillsResponse } from '../../../common/impact/impact_pills';
import type { ImpactRouteDependencies } from '../types';
import { handleRouteError } from './handle_route_error';
import { fitsPillsReach, impactPillsPageShape, PILLS_REACH_MESSAGE } from './impact_pills_page';
import { INTERNAL_ACCESS } from './shared';

const PROPOSALS_API_PRIVILEGE_READ = ApiPrivileges.read('proposals');

const MAX_QUERY_STRING_LENGTH = 64;
const MAX_CATEGORIES = 10;
const MAX_DECIDED_WITHIN_HOURS = 168;

/** A single `categories=a` arrives as a string, repeated keys as an array. */
export const proposalImpactPillsQuerySchema = lazySchema(() =>
  z
    .object({
      ...impactPillsPageShape(),
      origin: proposalOriginSchema,
      categories: z
        .union([
          z.string().min(1).max(MAX_QUERY_STRING_LENGTH),
          z.array(z.string().min(1).max(MAX_QUERY_STRING_LENGTH)).min(1).max(MAX_CATEGORIES),
        ])
        .transform((value) => (Array.isArray(value) ? value : [value])),
      decidedWithinHours: z.coerce.number().int().min(1).max(MAX_DECIDED_WITHIN_HOURS).optional(),
    })
    .refine(fitsPillsReach, { message: PILLS_REACH_MESSAGE })
);

export const registerGetProposalImpactPillsRoute = ({
  router,
  logger,
  getImpactPillsService,
}: ImpactRouteDependencies) => {
  router.versioned
    .get({
      path: IMPACT_PROPOSAL_SUMMARY_URL,
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
          const body: ImpactPillsResponse = await getImpactPillsService().forProposals(
            request,
            request.query
          );
          return response.ok({ body });
        } catch (error) {
          return handleRouteError(error, response, logger);
        }
      }
    );
};
