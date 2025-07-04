/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod';
import { estypes } from '@elastic/elasticsearch';
import { Streams, UnwiredIngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import { processAsyncInChunks } from '../../../../utils/process_async_in_chunks';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { getDataStreamLifecycle } from '../../../../lib/streams/stream_crud';

export interface ListStreamDetail {
  stream: Streams.all.Definition;
  effective_lifecycle: UnwiredIngestStreamEffectiveLifecycle;
  data_stream?: estypes.IndicesDataStream;
}

export const listStreamsRoute = createServerRoute({
  endpoint: 'GET /internal/streams',
  options: {
    access: 'internal',
  },
  params: z.object({}),
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({ request, getScopedClients }): Promise<{ streams: ListStreamDetail[] }> => {
    const { streamsClient, scopedClusterClient } = await getScopedClients({ request });
    const streams = await streamsClient.listStreamsWithDataStreamExistence();

    const streamNames = streams.filter(({ exists }) => exists).map(({ stream }) => stream.name);

    const dataStreams = await processAsyncInChunks(streamNames, (streamNamesChunk) =>
      scopedClusterClient.asCurrentUser.indices.getDataStream({ name: streamNamesChunk })
    );

    const enrichedStreams = streams.reduce<ListStreamDetail[]>((acc, { stream }) => {
      const match = dataStreams.data_streams.find((dataStream) => dataStream.name === stream.name);
      acc.push({
        stream,
        effective_lifecycle: getDataStreamLifecycle(match ?? null),
        data_stream: match,
      });
      return acc;
    }, []);

    return { streams: enrichedStreams };
  },
});

export interface StreamDetailsResponse {
  details: {
    count: number;
  };
}

export const streamDetailRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{name}/_details',
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
    query: z.object({
      start: z.string(),
      end: z.string(),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<StreamDetailsResponse> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const streamEntity = await streamsClient.getStream(params.path.name);

    const indexPattern = Streams.GroupStream.Definition.is(streamEntity)
      ? streamEntity.group.members.join(',')
      : streamEntity.name;
    // check doc count
    const docCountResponse = await scopedClusterClient.asCurrentUser.search({
      index: indexPattern,
      track_total_hits: true,
      ignore_unavailable: true,
      query: {
        range: {
          '@timestamp': {
            gte: params.query.start,
            lte: params.query.end,
          },
        },
      },
      size: 0,
    });

    const count = (docCountResponse.hits.total as SearchTotalHits).value;

    return {
      details: {
        count,
      },
    };
  },
});

export const resolveIndexRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_resolve_index',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({
      index: z.string(),
    }),
  }),
  handler: async ({
    request,
    params,
    getScopedClients,
  }): Promise<{ stream?: Streams.all.Definition }> => {
    const { scopedClusterClient, streamsClient } = await getScopedClients({ request });
    const response = (
      await scopedClusterClient.asCurrentUser.indices.get({ index: params.query.index })
    )[params.query.index];
    const dataStream = response.data_stream;
    if (!dataStream) {
      return {};
    }
    const stream = await streamsClient.getStream(dataStream);
    return { stream };
  },
});

export const internalCrudRoutes = {
  ...listStreamsRoute,
  ...streamDetailRoute,
  ...resolveIndexRoute,
};
