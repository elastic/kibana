/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH, RUNNING_QUERIES_READ_PRIVILEGE } from '../../common/constants';
import type { RouteOptions } from '.';

export const registerPrivilegesRoute = ({ router, logger }: RouteOptions) => {
  const requiredClusterPrivileges = ['monitor', 'manage'] as const;

  router.get(
    {
      path: `${API_BASE_PATH}/privileges`,
      security: {
        authz: {
          requiredPrivileges: [RUNNING_QUERIES_READ_PRIVILEGE],
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
          // If Elasticsearch security isn't enabled (or isn't available on the client),
          // we can't perform a privilege check. In that case, default to "allowed".
          return response.ok({
            body: { canCancelTasks: true, canViewTasks: true, missingClusterPrivileges: [] },
          });
        }

        const { has_all_requested: hasAllRequested, cluster } = await hasPrivileges.call(
          esClient.security,
          { cluster: [...requiredClusterPrivileges] }
        );

        const missingClusterPrivileges = requiredClusterPrivileges.filter(
          (privilege) => !cluster?.[privilege]
        );

        const canCancelTasks = hasAllRequested || Boolean(cluster.manage);
        const canViewTasks = hasAllRequested || Boolean(cluster.monitor);

        return response.ok({ body: { canCancelTasks, canViewTasks, missingClusterPrivileges } });
      } catch (error) {
        logger.debug(`Failed to check running queries privileges: ${error}`);
        return response.ok({
          body: { canCancelTasks: false, canViewTasks: false, missingClusterPrivileges: [] },
        });
      }
    }
  );
};
