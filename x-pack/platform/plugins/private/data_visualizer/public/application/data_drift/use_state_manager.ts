/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { RandomSampler } from '@kbn/ml-random-sampler-utils';

export const defaultSearchQuery = {
  match_all: {},
};

interface StateManagerInitialParams {
  id: string;
  indexPattern: string;
  searchString: string;
  searchQuery: estypes.QueryDslQueryContainer;
  searchQueryLanguage: SearchQueryLanguage;
  filters: Filter[];
  timeField?: string;
}

export const DataDriftStateManagerContext = createContext<{
  dataView: DataView;
  reference: DataDriftStateManager;
  comparison: DataDriftStateManager;
}>({
  get dataView(): never {
    throw new Error('DataDriftStateManagerContext is not implemented');
  },
  get reference(): never {
    throw new Error('reference is not implemented');
  },
  get comparison(): never {
    throw new Error('comparison is not implemented');
  },
});

export type DataDriftStateManager = ReturnType<typeof useDataDriftStateManager>;

export const useDataDriftStateManager = ({
  id,
  indexPattern: initialIndexPattern,
  searchString: initialSearchString,
  searchQuery: initialSearchQuery,
  searchQueryLanguage: initialSearchQueryLanguage,
  filters: initialFilters,
  timeField: initialTimeField,
}: StateManagerInitialParams) => {
  const [query, setQuery] = useState(initialSearchQuery);
  const [indexPattern, setIndexPattern] = useState(initialIndexPattern);
  const [searchString, setSearchString] = useState(initialSearchString);
  const [searchQueryLanguage, setSearchQueryLanguage] = useState(initialSearchQueryLanguage);
  const [filters, setFilters] = useState(initialFilters);
  const [timeField, setTimeField] = useState(initialTimeField);
  const [randomSampler] = useState(new RandomSampler());

  return {
    id,
    query,
    setQuery,
    indexPattern,
    setIndexPattern,
    searchString,
    setSearchString,
    searchQueryLanguage,
    setSearchQueryLanguage,
    filters,
    setFilters,
    timeField,
    setTimeField,
    randomSampler,
  };
};

export function useDataDriftStateManagerContext() {
  return useContext(DataDriftStateManagerContext);
}
