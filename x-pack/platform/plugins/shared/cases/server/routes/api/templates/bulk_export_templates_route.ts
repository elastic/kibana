/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';
import { INTERNAL_BULK_EXPORT_TEMPLATES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { escapeHatch } from '../utils';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { mockTemplates } from './mock_data';
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
    body: escapeHatch,
  },
  routerOptions: {
    access: 'internal',
    summary: 'Bulk export case templates',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const { ids } = request.body as { ids: string[] };

      if (!Array.isArray(ids) || ids.length === 0) {
        return response.badRequest({
          body: { message: 'ids must be a non-empty array of template IDs' },
        });
      }

      const templates = mockTemplates.filter(
        (t) => ids.includes(t.templateId) && t.deletedAt === null
      );

      const notFound = ids.filter((id) => !templates.some((t) => t.templateId === id));

      if (notFound.length > 0) {
        return response.notFound({
          body: { message: `Templates not found: ${notFound.join(', ')}` },
        });
      }

      const parsedTemplates: ParsedTemplate[] = templates.map((template) =>
        parseTemplate(template)
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
