/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { streamMatchesIndexPatterns, DEFAULT_INDEX_PATTERNS } from '@kbn/streams-schema';
import { OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS } from '@kbn/management-settings-ids';
import { useKibana } from './use_kibana';

/**
 * Hook to get configured index patterns and utilities.
 * Reads from the uiSettings store (per-space, hidden from Advanced Settings).
 */
export function useIndexPatternsConfig() {
  const { core } = useKibana();

  const rawValue = core.settings.client.get<string>(
    OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS,
    DEFAULT_INDEX_PATTERNS
  );

  const indexPatterns = useMemo(() => {
    const patterns = rawValue
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    return patterns.length > 0 ? patterns : [DEFAULT_INDEX_PATTERNS];
  }, [rawValue]);

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
    isLoading: false,
    error: undefined,
  };
}
