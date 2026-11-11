/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { isBoom } from '@hapi/boom';
import { CASE_TEMPLATE_DETAILS_URL, MAX_TEMPLATE_KEY_LENGTH } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * DELETE /api/cases/templates/{template_id}
 * Public route — soft-deletes a template (all versions). Cases created from the template keep
 * their pinned reference; the template stops appearing in the create flow and find responses.
 */
export const deletePublicTemplateRoute = createCasesRoute({
  method: 'delete',
  path: CASE_TEMPLATE_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'public',
    summary: 'Delete a case template',
    tags: ['oas-tag:cases'],
  },
  params: {
    params: schema.object({
      template_id: schema.string({ maxLength: MAX_TEMPLATE_KEY_LENGTH }),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      await casesClient.templates.deleteTemplate(request.params.template_id);

      return response.noContent();
    } catch (error) {
      if (isBoom(error) && error.output.statusCode === 404) {
        return response.notFound({ body: { message: error.message } });
      }

      throw createCaseError({
        message: `Failed to delete template: ${error}`,
        error,
      });
    }
  },
});
