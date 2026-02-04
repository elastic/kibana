/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';
import { INTERNAL_TEMPLATES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { mockTemplates } from './mock_data';
import { parseTemplate } from './parse_template';

/**
 * GET /internal/cases/templates
 * List all templates (excluding soft-deleted ones by default)
 */
export const getTemplatesRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Get all case templates',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const { includeDeleted } = request.query as { includeDeleted: boolean };

      const filteredTemplates = includeDeleted
        ? mockTemplates
        : mockTemplates.filter((t) => t.deletedAt === null);

      const parsedTemplates: ParsedTemplate[] = filteredTemplates.map((template) =>
        parseTemplate(template)
      );

      return response.ok({
        body: parsedTemplates,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get templates: ${error}`,
        error,
      });
    }
  },
});
