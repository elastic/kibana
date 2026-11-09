/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_TASK_COMMENTS_URL } from '../../../../common/constants';
import type { taskApiV1 } from '../../../../common/types/api';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const postTaskCommentRoute = createCasesRoute({
  method: 'post',
  path: CASE_TASK_COMMENTS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Add a comment to a task',
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
      const comment = await casesClient.tasks.addComment(
        request.params.task_id,
        request.body as taskApiV1.TaskCommentCreateRequest
      );
      return response.ok({ body: comment });
    } catch (error) {
      throw createCaseError({
        message: `Failed to add a comment to a task in route: ${error}`,
        error,
      });
    }
  },
});
