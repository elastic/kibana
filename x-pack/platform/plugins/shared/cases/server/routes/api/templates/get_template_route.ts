/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_TEMPLATE_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { mockTemplates } from './mock_data';
import { parseTemplate } from './parse_template';

/**
 * GET /internal/cases/templates/{template_id}
 * Get a single template by ID
 */
export const getTemplateRoute = createCasesRoute({
  method: 'get',
  path: INTERNAL_TEMPLATE_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Get a case template by ID',
  },
  params: {
    params: schema.object({
      template_id: schema.string(),
    }),
    query: schema.object({
      version: schema.maybe(schema.number()),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const { template_id: templateId } = request.params;
      const { version } = request.query;

      // Find template by ID (and optionally version)
      const template = mockTemplates.find(
        (t) =>
          t.templateId === templateId &&
          t.deletedAt === null &&
          (version === undefined || t.templateVersion === version)
      );

      if (!template) {
        return response.notFound({
          body: { message: `Template with id ${templateId} not found` },
        });
      }

      const parsedTemplate = parseTemplate(template);

      return response.ok({
        body: parsedTemplate,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get template: ${error}`,
        error,
      });
    }
  },
});
