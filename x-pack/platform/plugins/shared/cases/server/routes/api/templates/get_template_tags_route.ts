/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_TEMPLATE_TAGS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * GET /internal/cases/templates/tags
 * Get all template tags
 */
export const getTemplateTagsRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_TEMPLATE_TAGS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Get case template tags',
  },
  handler: async ({ context, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const tags = await casesClient.templates.getTags();

      return response.ok({ body: tags });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve template tags: ${error}`,
        error,
      });
    }
  },
});
