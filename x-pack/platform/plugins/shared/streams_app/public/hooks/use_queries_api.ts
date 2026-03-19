/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import type { StreamQuery } from '@kbn/streams-schema';
import { useMemo } from 'react';
import { useKibana } from './use_kibana';

interface QueriesApi {
  promote: ({ queryIds }: { queryIds: string[] }) => Promise<{ promoted: number }>;
  promoteAll: () => Promise<{ promoted: number }>;
  upsertQuery: ({ query, streamName }: { query: StreamQuery; streamName: string }) => Promise<void>;
  removeQuery: ({ queryId, streamName }: { queryId: string; streamName: string }) => Promise<void>;
  getUnbackedQueriesCount: (signal?: AbortSignal | null) => Promise<{ count: number }>;
  abort: () => void;
}

export function useQueriesApi(): QueriesApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { signal, abort, refresh } = useAbortController();

  return useMemo(
    () => ({
      promote: async ({ queryIds }: { queryIds: string[] }) => {
        const params = { body: { queryIds } };
        return streamsRepositoryClient.fetch('POST /internal/streams/queries/_promote', {
          params,
          signal,
        });
      },
      upsertQuery: async ({ query, streamName }: { query: StreamQuery; streamName: string }) => {
        const { id, ...body } = query;

        await streamsRepositoryClient.fetch(
          'PUT /api/streams/{name}/queries/{queryId} 2023-10-31',
          {
            signal,
            params: {
              path: {
                name: streamName,
                queryId: id,
              },
              body,
            },
          }
        );
      },
      removeQuery: async ({ queryId, streamName }: { queryId: string; streamName: string }) => {
        await streamsRepositoryClient.fetch(
          'DELETE /api/streams/{name}/queries/{queryId} 2023-10-31',
          {
            signal,
            params: {
              path: {
                name: streamName,
                queryId,
              },
            },
          }
        );
      },
      promoteAll: async () => {
        return streamsRepositoryClient.fetch('POST /internal/streams/queries/_promote', {
          params: { body: {} },
          signal,
        });
      },
      getUnbackedQueriesCount: async (requestSignal?: AbortSignal | null) => {
        return streamsRepositoryClient.fetch('GET /internal/streams/queries/_unbacked_count', {
          signal: requestSignal ?? signal,
        });
      },
      abort: () => {
        abort();
        refresh();
      },
    }),
    [abort, refresh, signal, streamsRepositoryClient]
  );
}
