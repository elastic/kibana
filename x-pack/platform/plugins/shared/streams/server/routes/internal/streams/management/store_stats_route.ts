/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
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
    } catch (error) {
      // Return 0 only when the index doesn't exist yet; re-throw everything else
      // (e.g. 403 authorization errors) so the caller gets a proper HTTP response.
      if (error instanceof esErrors.ResponseError && error.statusCode === 404) {
        return { store_size_bytes: 0 };
      }
      throw error;
    }
  },
});
