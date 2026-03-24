/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_TASKS_APPLY_TEMPLATE_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * POST /api/cases/{case_id}/tasks/_apply_template
 * Apply a task template to a case, creating tasks from it
 */
export const applyTemplateRoute = createCasesRoute({
  method: 'post',
  path: CASE_TASKS_APPLY_TEMPLATE_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Apply a task template to a case',
  },
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
    body: schema.object({
      template_id: schema.string(),
      owner: schema.string(),
      due_date_anchor: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { case_id: caseId } = request.params;
      const { template_id: templateId, owner, due_date_anchor: dueDateAnchor } =
        request.body as {
          template_id: string;
          owner: string;
          due_date_anchor?: string;
        };

      const tasks = await casesClient.tasks.applyTemplate({
        caseId,
        templateId,
        owner,
        due_date_anchor: dueDateAnchor,
      });

      return response.ok({ body: { tasks } });
    } catch (error) {
      throw createCaseError({
        message: `Failed to apply task template: ${error}`,
        error,
      });
    }
  },
});
