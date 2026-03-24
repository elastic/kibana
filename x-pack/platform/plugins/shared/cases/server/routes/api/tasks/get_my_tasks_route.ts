/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { castArray } from 'lodash';
import { CASES_TASKS_MY_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

/**
 * GET /api/cases/tasks/_my
 * Get tasks assigned to the current user
 */
export const getMyTasksRoute = createCasesRoute({
  method: 'get',
  path: CASES_TASKS_MY_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Get tasks assigned to the current user',
  },
  params: {
    query: schema.object({
      user_profile_uid: schema.string(),
      case_ids: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
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
      due_date_from: schema.maybe(schema.string()),
      due_date_to: schema.maybe(schema.string()),
      include_completed: schema.maybe(schema.boolean()),
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

      const {
        user_profile_uid: userProfileUid,
        case_ids,
        status,
        priority,
        due_date_from,
        due_date_to,
        include_completed: includeCompleted,
        sort_field,
        sort_order,
        page,
        per_page,
      } = request.query as {
        user_profile_uid: string;
        case_ids?: string | string[];
        status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
        priority?: 'low' | 'medium' | 'high' | 'critical';
        due_date_from?: string;
        due_date_to?: string;
        include_completed?: boolean;
        sort_field?: 'created_at' | 'due_date' | 'priority' | 'sort_order' | 'status';
        sort_order?: 'asc' | 'desc';
        page?: number;
        per_page?: number;
      };

      const result = await casesClient.tasks.getMyTasks({
        userProfileUid,
        caseIds: case_ids ? castArray(case_ids).filter(Boolean) : undefined,
        status,
        priority,
        due_date_from,
        due_date_to,
        includeCompleted,
        sort_field,
        sort_order,
        page,
        per_page,
      });

      return response.ok({ body: result });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get my tasks: ${error}`,
        error,
      });
    }
  },
});
