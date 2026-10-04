/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_TASK_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const getTaskRoute = createCasesRoute({
  method: 'get',
  path: CASE_TASK_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Get a case task',
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
      const task = await casesClient.tasks.get(request.params.task_id);
      return response.ok({ body: task });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get a case task in route: ${error}`,
        error,
      });
    }
  },
});
