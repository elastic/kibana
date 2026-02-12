/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';
import { INTERNAL_BULK_EXPORT_TEMPLATES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { parseTemplate } from './parse_template';

/**
 * POST /internal/cases/templates/_bulk_export
 * Bulk export templates by IDs
 */
export const bulkExportTemplatesRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_BULK_EXPORT_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    body: schema.object({
      ids: schema.arrayOf(schema.string(), { maxSize: 1000 }),
    }),
  },
  routerOptions: {
    access: 'internal',
    summary: 'Bulk export case templates',
  },
  handler: async ({
    context,
    request: {
      body: { ids },
    },
    response,
  }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const templates = await Promise.all(
        ids.map(async (templateId) => ({
          templateId,
          template: await casesClient.templates.getTemplate(templateId),
        }))
      );

      const notFound = templates
        .filter(({ template }) => !template)
        .map(({ templateId }) => templateId);

      if (notFound.length > 0) {
        return response.notFound({
          body: { message: `Templates not found: ${notFound.join(', ')}` },
        });
      }

      const parsedTemplates: ParsedTemplate[] = templates.flatMap(({ template }) =>
        template ? [parseTemplate(template.attributes)] : []
      );

      return response.ok({
        body: parsedTemplates,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to bulk export templates: ${error}`,
        error,
      });
    }
  },
});
