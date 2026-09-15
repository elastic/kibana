/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatchedItem } from '@kbn/data-views-plugin/public';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

// Excludes dot-prefixed system indices from the default (unfiltered) listing.
const DEFAULT_PATTERN = '*,-.*';
const SEARCH_DEBOUNCE_MS = 250;
const NOT_ROLLUP_INDEX = () => false;

export interface UseIndicesOptions {
  search: string;
  enabled?: boolean;
}

export interface UseIndicesResult {
  indexNames: string[];
  isLoading: boolean;
  isError: boolean;
}

/**
 * Lists indices, aliases, and data streams matching the given search text, via the
 * `dataViews.getIndices` service backed by the ES `_resolve/index` endpoint.
 */
export const useIndices = ({ search, enabled = true }: UseIndicesOptions): UseIndicesResult => {
  const {
    services: { data },
  } = useKibana();

  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS).trim();
  const pattern = debouncedSearch ? `${debouncedSearch}*,-.*` : DEFAULT_PATTERN;

  const {
    data: matches,
    isLoading,
    isError,
  } = useQuery<MatchedItem[], Error>({
    queryKey: contextEngineQueryKeys.indices.list(debouncedSearch),
    queryFn: () => data.dataViews.getIndices({ pattern, isRollupIndex: NOT_ROLLUP_INDEX }),
    refetchOnWindowFocus: false,
    enabled,
  });

  const indexNames = useMemo(() => (matches ?? []).map((match) => match.name), [matches]);

  return {
    indexNames,
    isLoading: enabled && isLoading,
    isError: enabled && isError,
  };
};
