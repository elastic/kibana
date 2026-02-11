/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Streams } from '@kbn/streams-schema';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { StatusError } from '../../../../lib/streams/errors/status_error';
import { upsertDataStream } from '../../../../lib/streams/data_streams/manage_data_streams';

export const restoreDataStreamRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/_restore_data_stream',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ name: z.string() }),
  }),
  handler: async ({ params, request, getScopedClients, logger }): Promise<{ acknowledged: true }> => {
    const { streamsClient, scopedClusterClient } = await getScopedClients({ request });

    const stream = await streamsClient.getStream(params.path.name);
    if (!Streams.ingest.all.Definition.is(stream)) {
      throw new StatusError('Only ingest streams have a backing data stream', 400);
    }

    await upsertDataStream({
      esClient: scopedClusterClient.asCurrentUser,
      name: params.path.name,
      logger,
    });

    return { acknowledged: true };
  },
});

