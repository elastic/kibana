/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { castArray } from 'lodash';
import { CASES_TASKS_FIND_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * GET /api/cases/tasks/_find
 * Find tasks across cases with filters
 */
export const findTasksRoute = createCasesRoute({
  method: 'get',
  path: CASES_TASKS_FIND_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Find case tasks',
  },
  params: {
    query: schema.object({
      case_ids: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
      owners: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
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
      assignees: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
      due_date_from: schema.maybe(schema.string()),
      due_date_to: schema.maybe(schema.string()),
      parent_task_id: schema.maybe(schema.nullable(schema.string())),
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
      search: schema.maybe(schema.string()),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const {
        case_ids,
        owners,
        status,
        priority,
        assignees,
        due_date_from,
        due_date_to,
        parent_task_id,
        sort_field,
        sort_order,
        page,
        per_page,
        search,
      } = request.query as {
        case_ids?: string | string[];
        owners?: string | string[];
        status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
        priority?: 'low' | 'medium' | 'high' | 'critical';
        assignees?: string | string[];
        due_date_from?: string;
        due_date_to?: string;
        parent_task_id?: string | null;
        sort_field?: 'created_at' | 'due_date' | 'priority' | 'sort_order' | 'status';
        sort_order?: 'asc' | 'desc';
        page?: number;
        per_page?: number;
        search?: string;
      };

      const result = await casesClient.tasks.find({
        caseIds: case_ids ? castArray(case_ids).filter(Boolean) : undefined,
        owners: owners ? castArray(owners).filter(Boolean) : undefined,
        status,
        priority,
        assignees: assignees ? castArray(assignees).filter(Boolean) : undefined,
        due_date_from,
        due_date_to,
        parent_task_id,
        sort_field,
        sort_order,
        page,
        per_page,
        search,
      });

      return response.ok({ body: result });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find tasks: ${error}`,
        error,
      });
    }
  },
});
