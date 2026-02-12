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
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { mockTemplates } from './mock_data';

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
      await caseContext.getCasesClient();

      const allTags = mockTemplates
        .filter((t) => t.deletedAt === null)
        .flatMap((template) => template.tags ?? []);

      const uniqueTags = [...new Set(allTags)].sort();

      return response.ok({ body: uniqueTags });
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve template tags: ${error}`,
        error,
      });
    }
  },
});
