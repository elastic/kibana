/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { SuggestionOwner } from '../../../../common/types/domain';
import { isValidOwner } from '../../../../common/utils/owner';
import type { SuggestionResponse } from '../../../../common';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { INTERNAL_CASE_SUGGESTIONS_URL, GENERAL_CASES_OWNER } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';

const params = {
  params: schema.object({
    case_id: schema.string(),
  }),
};

export const getSuggestionsRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_CASE_SUGGESTIONS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params,
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }): Promise<IKibanaResponse<SuggestionResponse>> => {
    try {
      const [caseContext, spaceService] = await Promise.all([context.cases, context.spacesService]);
      const casesClient = await caseContext.getCasesClient();
      const caseData = await casesClient.cases.get({
        id: request.params.case_id,
        includeComments: true,
      });

      if (!caseData.comments) {
        throw createCaseError({
          message: `Case ${request.params.case_id} returned undefined for comments; this should never happen`,
        });
      }

      const metadata = {};

      const caseOwner = isValidOwner(caseData.owner) ? caseData.owner : undefined;

      if (!caseOwner) {
        throw createCaseError({
          message: `Invalid owner ${caseData.owner} for case ${request.params.case_id}; this should never happen`,
        });
      }

      // Cases (platform) suggestions are always included
      const owners: SuggestionOwner[] = [GENERAL_CASES_OWNER];
      if (caseOwner !== GENERAL_CASES_OWNER) {
        owners.push(caseOwner);
      }

      const suggestions = await casesClient.suggestions.getAllForOwners({
        owners,
        context: { ...metadata, spaceId: spaceService.getSpaceId(request) },
        request,
      });
      return response.ok({
        body: suggestions,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find suggestions in route: ${error}`,
        error,
      });
    }
  },
});
