/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_TASK_TEMPLATE_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * DELETE /api/cases/task_templates/{template_id}
 * Delete a task template by ID
 */
export const deleteTaskTemplateRoute = createCasesRoute({
  method: 'delete',
  path: CASE_TASK_TEMPLATE_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Delete a case task template',
  },
  params: {
    params: schema.object({
      template_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { template_id: templateId } = request.params;

      await casesClient.taskTemplates.delete(templateId);

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete task template: ${error}`,
        error,
      });
    }
  },
});
