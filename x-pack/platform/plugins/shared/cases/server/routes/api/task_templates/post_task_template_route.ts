/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASES_TASK_TEMPLATES_URL } from '../../../../common/constants';
import type { taskApiV1 } from '../../../../common/types/api';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const postTaskTemplateRoute = createCasesRoute({
  method: 'post',
  path: CASES_TASK_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Create a task list',
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      const template = await casesClient.taskTemplates.create(
        request.body as taskApiV1.TaskTemplateCreateRequest
      );
      return response.ok({ body: template });
    } catch (error) {
      throw createCaseError({
        message: `Failed to create a task list in route: ${error}`,
        error,
      });
    }
  },
});
