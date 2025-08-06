/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { suggestionRequestSchema } from '../../../../common/types/domain';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const findSuggestionsRoute = createCasesRoute({
  method: 'post',
  path: `/internal/case_suggestions/_find`,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: suggestionRequestSchema,
  },
  routerOptions: {
    access: 'internal',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      return response.ok({
        body: {},
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find cases in route: ${error}`,
        error,
      });
    }
  },
});
