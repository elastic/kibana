/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod';
import type { estypes } from '@elastic/elasticsearch';
import type { ClassicIngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import { OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS } from '@kbn/management-settings-ids';
import { processAsyncInChunks } from '../../../../utils/process_async_in_chunks';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { getDataStreamLifecycle } from '../../../../lib/streams/stream_crud';

export interface ListStreamDetail {
  stream: Streams.all.Definition;
  effective_lifecycle?: ClassicIngestStreamEffectiveLifecycle;
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
  handler: async ({
    request,
    getScopedClients,
  }): Promise<{ streams: ListStreamDetail[]; canReadFailureStore: boolean }> => {
    const { streamsClient, scopedClusterClient, uiSettingsClient } = await getScopedClients({
      request,
    });

    const [allStreams, isQueryStreamsEnabled] = await Promise.all([
      streamsClient.listStreamsWithDataStreamExistence(),
      uiSettingsClient.get<boolean>(OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS),
    ]);

    const availableStreams = allStreams.filter(({ stream }) => {
      const isQueryStream = Streams.QueryStream.Definition.is(stream);

      // Only include query streams if query streams are enabled
      return !isQueryStream || (isQueryStream && isQueryStreamsEnabled);
    });

    const streamNames = availableStreams
      .filter(({ exists }) => exists)
      .map(({ stream }) => stream.name);

    let canReadFailureStore = true;

    const dataStreams = await processAsyncInChunks(streamNames, async (streamNamesChunk) => {
      if (streamNamesChunk.length === 0) {
        return { data_streams: [] };
      }
      const [{ read_failure_store: readFailureStore }, dataStreamsChunk] = await Promise.all([
        streamsClient.getPrivileges(streamNamesChunk),
        scopedClusterClient.asCurrentUser.indices.getDataStream({ name: streamNamesChunk }),
      ]);

      if (!readFailureStore) {
        canReadFailureStore = false;
      }

      return dataStreamsChunk;
    });

    const enrichedStreams = availableStreams.map<ListStreamDetail>(({ stream }) => {
      if (Streams.QueryStream.Definition.is(stream)) {
        return { stream };
      }

      const match = dataStreams.data_streams.find((dataStream) => dataStream.name === stream.name);
      return {
        stream,
        effective_lifecycle: getDataStreamLifecycle(match ?? null),
        data_stream: match,
      };
    });

    return { streams: enrichedStreams, canReadFailureStore };
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

    // check doc count
    const docCountResponse = await scopedClusterClient.asCurrentUser.search({
      index: streamEntity.name,
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
