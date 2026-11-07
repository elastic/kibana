/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import { INTERNAL_PRIOR_OUTCOMES_URL, MAX_CASE_ID_LENGTH } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import type { PriorOutcomesQuery } from '../../../knowledge/prior_outcomes';
import { getPriorOutcomes } from '../../../knowledge/prior_outcomes';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export interface PriorOutcomesRouteDeps {
  getSpaceId: (request: KibanaRequest) => string;
  /** The context engine is on in the space and the caller holds its read privilege. */
  isAvailable: (request: KibanaRequest, spaceId: string) => Promise<boolean>;
  /** Queries the knowledge index as the caller (the context engine's read service). */
  getQuery: (request: KibanaRequest) => Promise<PriorOutcomesQuery>;
}

const paramsSchema = schema.object({
  case_id: schema.string({ minLength: 1, maxLength: MAX_CASE_ID_LENGTH }),
});

export const createPriorOutcomesRoute = ({
  getSpaceId,
  isAvailable,
  getQuery,
}: PriorOutcomesRouteDeps) =>
  createCasesRoute({
    method: 'get',
    path: INTERNAL_PRIOR_OUTCOMES_URL,
    security: DEFAULT_CASES_ROUTE_SECURITY,
    routerOptions: {
      access: 'internal',
      summary: 'Outcomes of similar closed cases, from the context engine',
    },
    handler: async ({ context, request, response }) => {
      // Validated here rather than through `params` so the route keeps the untyped shape the
      // route list expects.
      const { case_id: caseId } = paramsSchema.validate(request.params);
      try {
        const casesClient = await (await context.cases).getCasesClient();
        const spaceId = getSpaceId(request);
        const body = await getPriorOutcomes({
          client: casesClient,
          caseId,
          spaceId,
          isAvailable: () => isAvailable(request, spaceId),
          query: async (params) => (await getQuery(request))(params),
        });
        return response.ok({ body });
      } catch (error) {
        throw createCaseError({
          message: `Failed to get prior outcomes for case id: ${caseId}: ${error}`,
          error,
        });
      }
    },
  });
