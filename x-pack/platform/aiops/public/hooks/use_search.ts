/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { isQuery } from '@kbn/data-plugin/public';

import { getEsQueryFromSavedSearch } from '../application/utils/search_utils';
import {
  isDefaultSearchQuery,
  type AiOpsIndexBasedAppState,
} from '../application/url_state/common';
import { createMergedEsQuery } from '../application/utils/search_utils';

import { useAiopsAppContext } from './use_aiops_app_context';

export const useSearch = (
  { dataView, savedSearch }: { dataView: DataView; savedSearch: SavedSearch | null },
  aiopsListState: AiOpsIndexBasedAppState,
  readOnly: boolean = false
) => {
  const {
    uiSettings,
    data: {
      query: { filterManager },
    },
  } = useAiopsAppContext();

  const searchData = useMemo(
    () =>
      getEsQueryFromSavedSearch({
        dataView,
        uiSettings,
        savedSearch,
        filterManager,
      }),
    [dataView, uiSettings, savedSearch, filterManager]
  );

  return useMemo(() => {
    if (searchData === undefined || (aiopsListState && aiopsListState.searchString !== '')) {
      if (aiopsListState?.filters && readOnly === false) {
        const globalFilters = filterManager?.getGlobalFilters();

        if (filterManager) filterManager.setFilters(aiopsListState.filters);
        if (globalFilters) filterManager?.addFilters(globalFilters);
      }

      // In cases where the url state contains only a KQL query and not yet
      // the transformed ES query we regenerate it. This may happen if we restore
      // url state on page load coming from another page like ML's Single Metric Viewer.
      let searchQuery = aiopsListState?.searchQuery;
      const query = {
        language: aiopsListState?.searchQueryLanguage,
        query: aiopsListState?.searchString,
      };
      if (
        (aiopsListState.searchString !== '' ||
          (Array.isArray(aiopsListState.filters) && aiopsListState.filters.length > 0)) &&
        (isDefaultSearchQuery(searchQuery) || searchQuery === undefined) &&
        isQuery(query)
      ) {
        searchQuery = createMergedEsQuery(query, aiopsListState.filters, dataView, uiSettings);
      }

      return {
        ...(isDefaultSearchQuery(searchQuery) ? {} : { searchQuery }),
        searchString: aiopsListState?.searchString,
        searchQueryLanguage: aiopsListState?.searchQueryLanguage,
      };
    } else {
      return {
        searchQuery: searchData.searchQuery,
        searchString: searchData.searchString,
        searchQueryLanguage: searchData.queryLanguage,
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify([searchData, aiopsListState])]);
};
