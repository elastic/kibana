/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IKibanaResponse } from '@kbn/core/server';
import { type SuggestionResponse } from '../../../../common/types/api';
import { suggestionRequestRt } from '../../../../common/types/api';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const findSuggestionsRoute = createCasesRoute({
  method: 'post',
  path: `/internal/case_suggestions/_find`,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: suggestionRequestRt,
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }): Promise<IKibanaResponse<SuggestionResponse>> => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const suggestions = await casesClient.suggestions.getAllForOwners({
        owners: request.body.owners,
        context: request.body.context,
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
