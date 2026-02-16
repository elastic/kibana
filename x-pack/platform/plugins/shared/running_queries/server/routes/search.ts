/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '../../common/constants';
import type { RouteOptions } from '.';

export const registerSearchRoute = ({ router }: RouteOptions) => {
  router.get(
    {
      path: `${API_BASE_PATH}/search`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is only available to authenticated users',
        },
      },
      validate: false,
      options: {
        access: 'internal',
      },
    },
    async (_context, _request, response) => {
      return response.ok({
        body: {
          queries: [
            {
              taskId: 'task-001',
              queryType: 'ES|QL',
              source: 'Discover',
              startTime: Date.now() - 5 * 60000,
            },
            {
              taskId: 'task-002',
              queryType: 'DSL',
              source: 'Dashboard',
              startTime: Date.now() - 2 * 60000,
            },
            {
              taskId: 'task-003',
              queryType: 'ES|QL',
              source: 'Rules',
              startTime: Date.now() - 10 * 60000,
            },
            {
              taskId: 'task-004',
              queryType: 'Other',
              source: 'Watcher',
              startTime: Date.now() - 1 * 60000,
            },
            {
              taskId: 'task-005',
              queryType: 'DSL',
              source: 'Discover',
              startTime: Date.now() - 8 * 60000,
            },
          ],
        },
      });
    }
  );
};
