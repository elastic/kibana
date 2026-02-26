/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '../../common/constants';
import type { RouteOptions } from '.';

export const registerPrivilegesRoute = ({ router, logger }: RouteOptions) => {
  router.get(
    {
      path: `${API_BASE_PATH}/privileges`,
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
    async (context, _request, response) => {
      try {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        const hasPrivileges = esClient.security?.hasPrivileges;
        if (typeof hasPrivileges !== 'function') {
          return response.ok({ body: { canCancelTasks: false } });
        }

        const result = await hasPrivileges.call(esClient.security, { cluster: ['manage'] });

        const canCancelTasks =
          Boolean((result as { has_all_requested?: boolean })?.has_all_requested) ||
          Boolean((result as { cluster?: Record<string, boolean> })?.cluster?.manage);

        return response.ok({ body: { canCancelTasks } });
      } catch (error) {
        logger.debug(`Failed to check running queries privileges: ${error}`);
        return response.ok({ body: { canCancelTasks: false } });
      }
    }
  );
};
