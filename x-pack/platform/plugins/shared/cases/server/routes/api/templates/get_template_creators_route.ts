/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_TEMPLATE_CREATORS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { mockTemplates } from './mock_data';

/**
 * GET /internal/cases/templates/creators
 * Get all template creators (authors)
 */
export const getTemplateCreatorsRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_TEMPLATE_CREATORS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Get case template creators',
  },
  handler: async ({ context, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const creators = mockTemplates
        .filter((t) => t.deletedAt === null)
        .map((t) => t.author)
        .filter((author): author is string => Boolean(author));

      const uniqueCreators = [...new Set(creators)].sort();

      return response.ok({ body: uniqueCreators });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve template creators: ${error}`,
        error,
      });
    }
  },
});
