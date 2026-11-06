/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_TASK_COMMENT_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

export const deleteTaskCommentRoute = createCasesRoute({
  method: 'delete',
  path: CASE_TASK_COMMENT_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Delete a task comment',
  },
  params: {
    params: schema.object({
      case_id: schema.string(),
      task_id: schema.string(),
      comment_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const casesClient = await (await context.cases).getCasesClient();
      await casesClient.tasks.deleteComment(request.params.task_id, request.params.comment_id);
      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete a task comment in route: ${error}`,
        error,
      });
    }
  },
});
