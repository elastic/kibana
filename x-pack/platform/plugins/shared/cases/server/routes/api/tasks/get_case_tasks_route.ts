/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_TASKS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * GET /api/cases/{case_id}/tasks
 * List all tasks for a specific case
 */
export const getCaseTasksRoute = createCasesRoute({
  method: 'get',
  path: CASE_TASKS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'List case tasks',
  },
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
    query: schema.object({
      status: schema.maybe(
        schema.oneOf([
          schema.literal('open'),
          schema.literal('in_progress'),
          schema.literal('completed'),
          schema.literal('cancelled'),
        ])
      ),
      priority: schema.maybe(
        schema.oneOf([
          schema.literal('low'),
          schema.literal('medium'),
          schema.literal('high'),
          schema.literal('critical'),
        ])
      ),
      sort_field: schema.maybe(
        schema.oneOf([
          schema.literal('created_at'),
          schema.literal('due_date'),
          schema.literal('priority'),
          schema.literal('sort_order'),
          schema.literal('status'),
        ])
      ),
      sort_order: schema.maybe(
        schema.oneOf([schema.literal('asc'), schema.literal('desc')])
      ),
      page: schema.maybe(schema.number({ min: 1 })),
      per_page: schema.maybe(schema.number({ min: 1, max: 100 })),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { case_id: caseId } = request.params;
      const { status, priority, sort_field, sort_order, page, per_page } = request.query as {
        status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
        priority?: 'low' | 'medium' | 'high' | 'critical';
        sort_field?: 'created_at' | 'due_date' | 'priority' | 'sort_order' | 'status';
        sort_order?: 'asc' | 'desc';
        page?: number;
        per_page?: number;
      };

      const result = await casesClient.tasks.find({
        caseIds: [caseId],
        status,
        priority,
        sort_field,
        sort_order,
        page,
        per_page,
      });

      return response.ok({ body: result });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get tasks for case: ${error}`,
        error,
      });
    }
  },
});
