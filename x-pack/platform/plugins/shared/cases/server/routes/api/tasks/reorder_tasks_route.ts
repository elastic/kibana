/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_TASKS_REORDER_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * PUT /api/cases/{case_id}/tasks/_reorder
 * Reorder tasks within a case (or within a parent task's subtask list)
 */
export const reorderTasksRoute = createCasesRoute({
  method: 'put',
  path: CASE_TASKS_REORDER_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Reorder case tasks',
  },
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
    body: schema.object({
      ordered_task_ids: schema.arrayOf(schema.string(), { minSize: 1 }),
      parent_task_id: schema.maybe(schema.nullable(schema.string())),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { case_id: caseId } = request.params;
      const { ordered_task_ids: orderedTaskIds, parent_task_id: parentTaskId } =
        request.body as {
          ordered_task_ids: string[];
          parent_task_id?: string | null;
        };

      await casesClient.tasks.reorder({
        caseId,
        orderedTaskIds,
        parentTaskId: parentTaskId ?? null,
      });

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to reorder tasks: ${error}`,
        error,
      });
    }
  },
});
