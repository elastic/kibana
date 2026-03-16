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

const subtaskSchema = schema.object({
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
});

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
  subtasks: schema.arrayOf(subtaskSchema, { defaultValue: [] }),
});

/**
 * PATCH /api/cases/task_templates/{template_id}
 * Partial update of a task template
 */
export const patchTaskTemplateRoute = createCasesRoute({
  method: 'patch',
  path: CASE_TASK_TEMPLATE_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Update a case task template',
  },
  params: {
    params: schema.object({
      template_id: schema.string(),
    }),
    body: schema.object({
      version: schema.string(),
      name: schema.maybe(schema.string({ minLength: 1, maxLength: 160 })),
      description: schema.maybe(schema.string({ maxLength: 30000 })),
      scope: schema.maybe(
        schema.oneOf([schema.literal('global'), schema.literal('space')])
      ),
      tags: schema.maybe(schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: 200 })),
      tasks: schema.maybe(schema.arrayOf(taskSchema, { minSize: 1 })),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { template_id: templateId } = request.params;
      const body = request.body as {
        version: string;
        name?: string;
        description?: string;
        scope?: 'global' | 'space';
        tags?: string[];
        tasks?: Array<{
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
      };

      const template = await casesClient.taskTemplates.update({
        templateId,
        ...body,
      });

      return response.ok({ body: template });
    } catch (error) {
      throw createCaseError({
        message: `Failed to update task template: ${error}`,
        error,
      });
    }
  },
});
