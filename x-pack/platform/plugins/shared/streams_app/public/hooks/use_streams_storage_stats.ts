/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from './use_kibana';
import { useStreamsAppFetch } from './use_streams_app_fetch';

interface UseStreamsStorageStatsResult {
  storageByStream: Record<string, number>;
  storageLoaded: boolean;
}

/**
 * Fetches total storage size (bytes) for all streams in a single bulk request.
 */
export const useStreamsStorageStats = (): UseStreamsStorageStatsResult => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const storeStatsFetch = useStreamsAppFetch(
    ({ signal }) =>
      streamsRepositoryClient.fetch('GET /internal/streams/storage_stats', { signal }),
    [streamsRepositoryClient]
  );

  const storageByStream = useMemo(() => {
    if (!storeStatsFetch.value) return {};
    const map: Record<string, number> = {};
    for (const { stream, store_size_bytes: sizeBytes } of storeStatsFetch.value) {
      map[stream] = sizeBytes;
    }
    return map;
  }, [storeStatsFetch.value]);

  return {
    storageByStream,
    storageLoaded: !storeStatsFetch.loading,
  };
};
