/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import { useMemo } from 'react';
import { useKibana } from './use_kibana';

export function useStreamsSuggestionApi(streamName: string) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  return useMemo(
    () => ({
      scheduleSuggestionTask: async ({
        connectorId,
        start,
        end,
      }: {
        connectorId?: string;
        start: number;
        end: number;
      }) => {
        return streamsRepositoryClient.fetch('POST /internal/streams/{name}/_suggestion/_task', {
          signal,
          params: {
            path: { name: streamName },
            body: {
              action: 'schedule' as const,
              connectorId,
              start,
              end,
            },
          },
        });
      },
      getSuggestionTaskStatus: async () => {
        return streamsRepositoryClient.fetch('GET /internal/streams/{name}/_suggestion/_status', {
          signal,
          params: {
            path: { name: streamName },
          },
        });
      },
      cancelSuggestionTask: async () => {
        return streamsRepositoryClient.fetch('POST /internal/streams/{name}/_suggestion/_task', {
          signal,
          params: {
            path: { name: streamName },
            body: {
              action: 'cancel' as const,
            },
          },
        });
      },
      acknowledgeSuggestionTask: async () => {
        return streamsRepositoryClient.fetch('POST /internal/streams/{name}/_suggestion/_task', {
          signal,
          params: {
            path: { name: streamName },
            body: {
              action: 'acknowledge' as const,
            },
          },
        });
      },
    }),
    [streamName, signal, streamsRepositoryClient]
  );
}
