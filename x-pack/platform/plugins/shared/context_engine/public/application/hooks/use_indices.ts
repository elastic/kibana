/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatchedItem } from '@kbn/data-views-plugin/public';
import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

// Excludes dot-prefixed system indices from the default (unfiltered) listing.
const DEFAULT_PATTERN = '*,-.*';
const NOT_ROLLUP_INDEX = () => false;

export type IndexResourceType = 'index' | 'alias' | 'data_stream';

export interface UseIndicesOptions {
  search: string;
  enabled?: boolean;
  types?: IndexResourceType[];
}

export interface UseIndicesResult {
  indexNames: string[];
  isLoading: boolean;
  isError: boolean;
}

const matchesTypes = (match: MatchedItem, types: IndexResourceType[] | undefined): boolean =>
  !types || match.tags.some((tag) => types.includes(tag.key as IndexResourceType));

/**
 * Lists indices, aliases, and data streams matching the given search text.
 */
export const useIndices = ({
  search,
  enabled = true,
  types,
}: UseIndicesOptions): UseIndicesResult => {
  const {
    services: { data },
  } = useKibana();

  const trimmedSearch = search.trim();
  const pattern = trimmedSearch ? `${trimmedSearch}*,-.*` : DEFAULT_PATTERN;

  const {
    data: matches,
    isLoading,
    isError,
  } = useQuery<MatchedItem[], Error>({
    queryKey: contextEngineQueryKeys.indices.list(trimmedSearch),
    queryFn: () => data.dataViews.getIndices({ pattern, isRollupIndex: NOT_ROLLUP_INDEX }),
    refetchOnWindowFocus: false,
    enabled,
  });

  const indexNames = useMemo(
    () => (matches ?? []).filter((match) => matchesTypes(match, types)).map((match) => match.name),
    [matches, types]
  );

  return {
    indexNames,
    isLoading: enabled && isLoading,
    isError: enabled && isError,
  };
};
