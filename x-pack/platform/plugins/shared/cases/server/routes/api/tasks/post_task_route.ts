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
 * POST /api/cases/{case_id}/tasks
 * Create a new task for a case
 */
export const postTaskRoute = createCasesRoute({
  method: 'post',
  path: CASE_TASKS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Create a case task',
  },
  params: {
    params: schema.object({
      case_id: schema.string(),
    }),
    body: schema.object({
      title: schema.string({ minLength: 1, maxLength: 160 }),
      description: schema.maybe(schema.string({ maxLength: 30000 })),
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
      assignees: schema.maybe(
        schema.arrayOf(schema.object({ uid: schema.string() }), { maxSize: 10 })
      ),
      due_date: schema.maybe(schema.nullable(schema.string())),
      parent_task_id: schema.maybe(schema.nullable(schema.string())),
      owner: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { case_id: caseId } = request.params;
      const body = request.body as {
        title: string;
        description?: string;
        status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
        priority?: 'low' | 'medium' | 'high' | 'critical';
        assignees?: Array<{ uid: string }>;
        due_date?: string | null;
        parent_task_id?: string | null;
        owner: string;
      };

      const task = await casesClient.tasks.create({
        caseId,
        ...body,
      });

      return response.ok({ body: task });
    } catch (error) {
      throw createCaseError({
        message: `Failed to create task: ${error}`,
        error,
      });
    }
  },
});
