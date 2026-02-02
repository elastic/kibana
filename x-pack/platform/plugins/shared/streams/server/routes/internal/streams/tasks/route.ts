/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';

const listTasksRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_tasks',
  options: {
    access: 'internal',
    summary: 'List all tasks in the task index',
    description:
      'Lists all tasks in the internal task index. Returns up to 10,000 tasks with their ID and creation timestamp.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    request,
    getScopedClients,
  }): Promise<{ tasks: Array<{ id: string; created_at: string }> }> => {
    const { taskClient } = await getScopedClients({
      request,
    });

    const tasks = await taskClient.list();

    return { tasks };
  },
});

const deleteTaskRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/_tasks/{id}',
  options: {
    access: 'internal',
    summary: 'Delete a single task by ID',
    description:
      'Deletes a specific task document from the task index by its ID. Returns 404 if the task does not exist.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      id: z.string().describe('The task ID to delete'),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<{ acknowledged: boolean }> => {
    const { taskClient } = await getScopedClients({
      request,
    });

    await taskClient.deleteTask(params.path.id);

    return { acknowledged: true };
  },
});

export const internalTasksRoutes = {
  ...listTasksRoute,
  ...deleteTaskRoute,
};
