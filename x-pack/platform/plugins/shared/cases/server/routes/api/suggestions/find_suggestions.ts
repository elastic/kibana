/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { isValidOwner } from '../../../../common/utils/owner';
import { INTERNAL_CASE_SUGGESTIONS_URL } from '../../../../common/constants';
import type { SuggestionResponse } from '../../../../common/types/api';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

const params = {
  params: schema.object({
    case_id: schema.string(),
  }),
};

export const findSuggestionsRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_CASE_SUGGESTIONS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params,

  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }): Promise<IKibanaResponse<SuggestionResponse>> => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const caseData = await casesClient.cases.get({
        id: request.params.case_id,
        includeComments: true,
      });
      const metadata = await casesClient.cases.getMetadata({
        comments: caseData.comments || [],
      });

      const owner = isValidOwner(caseData.owner) ? caseData.owner : undefined;
      if (!owner) {
        throw createCaseError({
          message: `Invalid owner: ${caseData.owner}`,
        });
      }

      const suggestions = await casesClient.suggestions.getAllForOwners({
        owners: [owner],
        context: metadata,
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
