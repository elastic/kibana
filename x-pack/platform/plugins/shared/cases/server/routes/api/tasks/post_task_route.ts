/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_TASKS_URL } from '../../../../common/constants';
import type { taskApiV1 } from '../../../../common/types/api';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

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
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      const task = await casesClient.tasks.create(
        request.params.case_id,
        request.body as taskApiV1.TaskCreateRequest
      );
      return response.ok({ body: task });
    } catch (error) {
      throw createCaseError({
        message: `Failed to create a case task in route: ${error}`,
        error,
      });
    }
  },
});
