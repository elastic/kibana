/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { versionCheckHandlerWrapper } from '@kbn/upgrade-assistant-pkg-server';
import { API_BASE_PATH } from '../../common/constants';
import type { RouteDependencies } from '../types';

export function registerRemoteClustersRoute({
  router,
  current,
  lib: { handleEsError },
}: RouteDependencies) {
  router.get(
    {
      path: `${API_BASE_PATH}/remote_clusters`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: false,
    },
    versionCheckHandlerWrapper(current.major)(async ({ core }, request, response) => {
      try {
        const {
          elasticsearch: { client },
        } = await core;
        const clustersByName = await client.asCurrentUser.cluster.remoteInfo();

        const remoteClusters = Object.keys(clustersByName);

        return response.ok({ body: remoteClusters });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}
