/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import { useMemo } from 'react';
import { useKibana } from './use_kibana';

interface QueriesApi {
  promoteAll: () => Promise<{ promoted: number }>;
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
      promoteAll: async () => {
        return streamsRepositoryClient.fetch('POST /internal/streams/queries/_promote_all', {
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
