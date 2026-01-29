/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import {
  aggregateDiskUsage,
  type DiskUsageResponse,
  type FieldStatisticsResponse,
} from './aggregate_disk_usage';

const fieldStatisticsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/field_statistics',
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
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<FieldStatisticsResponse> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const name = params.path.name;

    // Disk usage API is not available in serverless
    if (server.isServerless) {
      return {
        isSupported: false,
        fields: [],
        totalFields: 0,
      };
    }

    // Verify the stream exists and user has read access
    await streamsClient.getStream(name);

    // Get the data stream to find backing indices
    const dataStream = await streamsClient.getDataStream(name);

    // Query disk usage stats using the data stream name (covers all backing indices)
    const response = (await scopedClusterClient.asCurrentUser.indices.diskUsage({
      index: dataStream.name,
      run_expensive_tasks: true,
    })) as DiskUsageResponse;

    const fields = aggregateDiskUsage(response);

    return {
      isSupported: true,
      fields,
      totalFields: fields.length,
    };
  },
});

export const internalFieldStatisticsRoutes = {
  ...fieldStatisticsRoute,
};
