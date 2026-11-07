/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_TASK_COMMENTS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const getTaskCommentsRoute = createCasesRoute({
  method: 'get',
  path: CASE_TASK_COMMENTS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Get the comments of a task',
  },
  params: {
    params: schema.object({
      case_id: schema.string(),
      task_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      const body = await casesClient.tasks.getComments(request.params.task_id);
      return response.ok({ body });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get the comments of a task in route: ${error}`,
        error,
      });
    }
  },
});
