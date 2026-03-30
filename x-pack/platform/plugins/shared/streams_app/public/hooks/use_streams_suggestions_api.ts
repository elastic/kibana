/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import { useKibana } from './use_kibana';

export function useStreamsSuggestionsApi() {
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
      getStreamSuggestions: async ({
        streamName,
        connectorId,
        start,
        end,
      }: {
        streamName: string;
        connectorId: string;
        start: number;
        end: number;
      }) => {
        return streamsRepositoryClient.fetch('POST /internal/streams/{name}/_suggestions', {
          signal,
          params: {
            path: { name: streamName },
            body: {
              connector_id: connectorId,
              start,
              end,
            },
          },
        });
      },
    }),
    [signal, streamsRepositoryClient]
  );
}
