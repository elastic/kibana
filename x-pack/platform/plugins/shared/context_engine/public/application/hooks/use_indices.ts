/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexKind, MatchedItem } from '@kbn/data-views-plugin/public';
import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

const DOT_PREFIXED_EXCLUSION = '-.*';
const NOT_ROLLUP_INDEX = () => false;

/** Cap on combobox options after type filtering, to keep the list usable. */
export const MAX_INDEX_SEARCH_RESULTS = 50;

export type IndexResourceType = 'index' | 'alias' | 'data_stream';

const isIndexResourceType = (key: IndexKind): key is IndexResourceType =>
  key === 'index' || key === 'alias' || key === 'data_stream';

export interface UseIndicesOptions {
  search: string;
  enabled?: boolean;
  types?: IndexResourceType[];
  /** Names matching this predicate are dropped before the results cap. */
  exclude?: (indexName: string) => boolean;
}

export interface UseIndicesResult {
  indexNames: string[];
  isFetching: boolean;
  /** True only while the first response is pending (no cached results yet). */
  isInitialLoading: boolean;
}

// Dot-prefixed system indices are hidden unless the search itself starts with a dot.
const buildPattern = (search: string): string => {
  if (!search) {
    return `*,${DOT_PREFIXED_EXCLUSION}`;
  }
  if (search.startsWith('.')) {
    return `*${search}*`;
  }
  return `*${search}*,${DOT_PREFIXED_EXCLUSION}`;
};

const matchesTypes = (match: MatchedItem, types: IndexResourceType[] | undefined): boolean =>
  !types || match.tags.some((tag) => isIndexResourceType(tag.key) && types.includes(tag.key));

/**
 * Lists indices, aliases, and data streams matching the given search text.
 */
export const useIndices = ({
  search,
  enabled = true,
  types,
  exclude,
}: UseIndicesOptions): UseIndicesResult => {
  const {
    services: { data },
  } = useKibana();

  const trimmedSearch = search.trim();
  const pattern = buildPattern(trimmedSearch);

  const {
    data: matches,
    isFetching,
    isInitialLoading,
  } = useQuery<MatchedItem[], Error>({
    queryKey: contextEngineQueryKeys.indices.list(trimmedSearch),
    queryFn: () => data.dataViews.getIndices({ pattern, isRollupIndex: NOT_ROLLUP_INDEX }),
    refetchOnWindowFocus: false,
    enabled,
    keepPreviousData: true,
  });

  const indexNames = useMemo(
    () =>
      (matches ?? [])
        .filter((match) => matchesTypes(match, types))
        .map((match) => match.name)
        .filter((name) => !exclude?.(name))
        .slice(0, MAX_INDEX_SEARCH_RESULTS),
    [matches, types, exclude]
  );

  return {
    indexNames,
    isFetching: enabled && isFetching,
    isInitialLoading: enabled && isInitialLoading,
  };
};
