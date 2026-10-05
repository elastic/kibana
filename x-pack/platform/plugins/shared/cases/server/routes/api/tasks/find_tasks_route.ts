/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASES_TASKS_FIND_URL } from '../../../../common/constants';
import type { taskApiV1 } from '../../../../common/types/api';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const findTasksRoute = createCasesRoute({
  method: 'get',
  path: CASES_TASKS_FIND_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Find tasks across cases',
  },
  params: {
    query: schema.object({}, { unknowns: 'allow' }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      const body = await casesClient.tasks.find(request.query as taskApiV1.TasksFindRequest);
      return response.ok({ body });
    } catch (error) {
      throw createCaseError({
        message: `Failed to find tasks across cases in route: ${error}`,
        error,
      });
    }
  },
});
