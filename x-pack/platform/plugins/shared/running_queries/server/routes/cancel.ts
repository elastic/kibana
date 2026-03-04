/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { API_BASE_PATH, RUNNING_QUERIES_WRITE_PRIVILEGE } from '../../common/constants';
import type { RouteOptions } from '.';

export const registerCancelRoute = ({ router, logger }: RouteOptions) => {
  router.post(
    {
      path: `${API_BASE_PATH}/cancel`,
      security: {
        authz: {
          requiredPrivileges: [RUNNING_QUERIES_WRITE_PRIVILEGE],
        },
      },
      validate: {
        body: schema.object({
          taskId: schema.string({ minLength: 1 }),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    async (context, request, response) => {
      const { taskId } = request.body;

      try {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        const result = await esClient.tasks.cancel({
          task_id: taskId,
          wait_for_completion: false,
        });

        return response.ok({ body: result });
      } catch (error) {
        const statusCode =
          (error as { statusCode?: number; meta?: { statusCode?: number } })?.statusCode ??
          (error as { statusCode?: number; meta?: { statusCode?: number } })?.meta?.statusCode;

        // If the task is already completed/removed, treat as success so the action is idempotent.
        if (statusCode === 404) {
          return response.ok({ body: { acknowledged: true } });
        }

        if (statusCode === 403) {
          return response.forbidden({ body: { message: 'Insufficient privileges to stop query' } });
        }

        logger.error(`Failed to cancel running query task "${taskId}": ${error}`);
        return response.customError({
          statusCode:
            statusCode ??
            (error as { statusCode?: number; meta?: { statusCode?: number } })?.statusCode ??
            (error as { statusCode?: number; meta?: { statusCode?: number } })?.meta?.statusCode ??
            500,
          body: { message: 'Failed to stop query' },
        });
      }
    }
  );
};
