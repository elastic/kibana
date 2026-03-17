/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useStreamsAppFetch } from './use_streams_app_fetch';
import { useKibana } from './use_kibana';

const DEFAULT_INDEX_PATTERNS = ['logs*'];

/**
 * Client-side utility to check if a stream matches index patterns.
 */
function streamMatchesIndexPatterns(streamName: string, indexPatterns: string[]): boolean {
  return indexPatterns.some((pattern) => {
    // Convert glob pattern to regex
    // Escape dots first, then convert glob wildcards
    const regexPattern = pattern
      .replace(/\./g, '\\.') // Escape literal dots first
      .replace(/\*/g, '.*') // Convert * to .*
      .replace(/\?/g, '.'); // Convert ? to .

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(streamName);
  });
}

/**
 * Hook to get configured index patterns and utilities.
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

  const indexPatterns = useMemo(() => {
    const configuredPatterns = settingsFetch.value?.indexPatterns;
    if (!configuredPatterns || configuredPatterns.trim() === '') {
      return DEFAULT_INDEX_PATTERNS;
    }

    // Split by comma and trim whitespace
    return configuredPatterns
      .split(',')
      .map((pattern) => pattern.trim())
      .filter((pattern) => pattern.length > 0);
  }, [settingsFetch.value?.indexPatterns]);

  const filterStreamsByIndexPatterns = useMemo(() => {
    return (streams: Array<{ stream: { name: string } }>) => {
      return streams.filter((streamItem) =>
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
