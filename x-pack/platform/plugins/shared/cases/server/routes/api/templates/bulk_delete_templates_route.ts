/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { INTERNAL_BULK_DELETE_TEMPLATES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * POST /internal/cases/templates/_bulk_delete
 * Bulk soft delete templates by IDs
 */
export const bulkDeleteTemplatesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_BULK_DELETE_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: schema.object({
      ids: schema.arrayOf(schema.string(), { maxSize: 1000 }),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: 'Bulk delete case templates',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { ids } = request.body as { ids: string[] };

      if (!Array.isArray(ids) || ids.length === 0) {
        return response.badRequest({
          body: { message: 'ids must be a non-empty array of template IDs' },
        });
      }

      const notFound: string[] = [];

      const templates = await Promise.all(
        ids.map(async (templateId) => ({
          templateId,
          template: await casesClient.templates.getTemplate(templateId),
        }))
      );

      templates.forEach(({ templateId, template }) => {
        if (!template) {
          notFound.push(templateId);
        }
      });

      if (notFound.length > 0) {
        return response.notFound({
          body: { message: `Templates not found: ${notFound.join(', ')}` },
        });
      }

      await Promise.all(ids.map((templateId) => casesClient.templates.deleteTemplate(templateId)));

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk delete templates: ${error}`,
        error,
      });
    }
  },
});
