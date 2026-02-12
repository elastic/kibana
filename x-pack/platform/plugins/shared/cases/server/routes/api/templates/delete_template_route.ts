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

/**
 * DELETE /internal/cases/templates/{template_id}
 * Soft delete a template (sets deletedAt timestamp)
 */
export const deleteTemplateRoute = createCasesRoute({
  method: 'delete',
  path: INTERNAL_TEMPLATE_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Delete a case template (soft delete)',
  },
  params: {
    params: schema.object({
      template_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const { template_id: templateId } = request.params;

      // Find all versions of the template
      const templateVersions = mockTemplates.filter(
        (t) => t.templateId === templateId && t.deletedAt === null
      );

      if (templateVersions.length === 0) {
        return response.notFound({
          body: { message: `Template with id ${templateId} not found` },
        });
      }

      // Soft delete all versions by setting deletedAt
      const deletedAt = new Date().toISOString();
      templateVersions.forEach((template) => {
        template.deletedAt = deletedAt;
      });

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete template with id ${request.params.template_id}: ${error}`,
        error,
      });
    }
  },
});
