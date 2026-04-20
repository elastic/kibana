/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';

export interface StreamStoreStat {
  store_size_bytes: number;
}

export const storeStatsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/_store_stats',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<StreamStoreStat> => {
    const { scopedClusterClient } = await getScopedClients({ request });
    const { name } = params.path;

    try {
      const stats = await scopedClusterClient.asCurrentUser.indices.stats({
        index: name,
        metric: ['store'],
      });
      return { store_size_bytes: stats._all?.primaries?.store?.size_in_bytes ?? 0 };
    } catch {
      return { store_size_bytes: 0 };
    }
  },
});
