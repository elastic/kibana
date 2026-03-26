/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { streamMatchesIndexPatterns } from '@kbn/streams-schema';
import { useStreamsAppFetch } from './use_streams_app_fetch';
import { useKibana } from './use_kibana';

/**
 * Hook to get configured index patterns and utilities.
 * Uses indexPatternsResolved from the API (server applies default); no client-side default.
 */
export function useIndexPatternsConfig() {
  const {
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  const settingsFetch = useStreamsAppFetch(
    async ({ signal }) =>
      streams.streamsRepositoryClient.fetch('GET /internal/streams/_significant_events/settings', {
        signal,
      }),
    [streams.streamsRepositoryClient]
  );

  const indexPatterns = useMemo(
    () => settingsFetch.value?.indexPatternsResolved ?? [],
    [settingsFetch.value?.indexPatternsResolved]
  );

  const filterStreamsByIndexPatterns = useMemo(() => {
    return <T extends { stream: { name: string } }>(streamsToFilter: T[]): T[] => {
      if (indexPatterns.length === 0) {
        return streamsToFilter;
      }
      return streamsToFilter.filter((streamItem) =>
        streamMatchesIndexPatterns(streamItem.stream.name, indexPatterns)
      );
    };
  }, [indexPatterns]);

  return {
    indexPatterns,
    filterStreamsByIndexPatterns,
    isLoading: settingsFetch.loading,
    error: settingsFetch.error,
  };
}
