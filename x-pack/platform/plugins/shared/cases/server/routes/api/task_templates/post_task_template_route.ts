/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASES_TASK_TEMPLATES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

const taskSchema = schema.object({
  title: schema.string({ minLength: 1, maxLength: 160 }),
  description: schema.string({ maxLength: 30000, defaultValue: '' }),
  priority: schema.oneOf([
    schema.literal('low'),
    schema.literal('medium'),
    schema.literal('high'),
    schema.literal('critical'),
  ]),
  relative_due_days: schema.nullable(schema.number({ min: 0 })),
  sort_order: schema.number({ defaultValue: 0 }),
  subtasks: schema.arrayOf(
    schema.object({
      title: schema.string({ minLength: 1, maxLength: 160 }),
      description: schema.string({ maxLength: 30000, defaultValue: '' }),
      priority: schema.oneOf([
        schema.literal('low'),
        schema.literal('medium'),
        schema.literal('high'),
        schema.literal('critical'),
      ]),
      relative_due_days: schema.nullable(schema.number({ min: 0 })),
      sort_order: schema.number({ defaultValue: 0 }),
    }),
    { defaultValue: [] }
  ),
});

/**
 * POST /api/cases/task_templates
 * Create a new task template
 */
export const postTaskTemplateRoute = createCasesRoute({
  method: 'post',
  path: CASES_TASK_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Create a case task template',
  },
  params: {
    body: schema.object({
      name: schema.string({ minLength: 1, maxLength: 160 }),
      description: schema.maybe(schema.string({ maxLength: 30000 })),
      scope: schema.maybe(
        schema.oneOf([schema.literal('global'), schema.literal('space')])
      ),
      tags: schema.maybe(schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: 200 })),
      tasks: schema.arrayOf(taskSchema, { minSize: 1 }),
      owner: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const body = request.body as {
        name: string;
        description?: string;
        scope?: 'global' | 'space';
        tags?: string[];
        tasks: Array<{
          title: string;
          description: string;
          priority: 'low' | 'medium' | 'high' | 'critical';
          relative_due_days: number | null;
          sort_order: number;
          subtasks: Array<{
            title: string;
            description: string;
            priority: 'low' | 'medium' | 'high' | 'critical';
            relative_due_days: number | null;
            sort_order: number;
          }>;
        }>;
        owner: string;
      };

      const template = await casesClient.taskTemplates.create(body);

      return response.ok({ body: template });
    } catch (error) {
      throw createCaseError({
        message: `Failed to create task template: ${error}`,
        error,
      });
    }
  },
});
