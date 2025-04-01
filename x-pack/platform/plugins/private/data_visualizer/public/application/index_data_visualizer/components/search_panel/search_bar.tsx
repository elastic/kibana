/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useState } from 'react';
import { isDefined } from '@kbn/ml-is-defined';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { debounce } from 'lodash';
import { useDataVisualizerKibana } from '../../../kibana_context';

export const SearchPanelContent = ({
  searchQuery,
  searchString,
  searchQueryLanguage,
  dataView,
  setSearchParams,
  onQueryChange,
}: {
  dataView: DataView;
  searchQuery: Query['query'];
  searchString: Query['query'];
  searchQueryLanguage: SearchQueryLanguage;
  onQueryChange?: (query: Query['query'] | undefined) => void;
  setSearchParams({
    searchQuery,
    searchString,
    queryLanguage,
    filters,
  }: {
    searchQuery: Query['query'];
    searchString: Query['query'];
    queryLanguage: SearchQueryLanguage;
    filters: Filter[];
  }): void;
}) => {
  const {
    services: {
      uiSettings,
      notifications: { toasts },
      data: { query: queryManager },
      unifiedSearch: {
        ui: { SearchBar },
      },
    },
  } = useDataVisualizerKibana();
  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>({
    query: searchString || '',
    language: searchQueryLanguage,
  });

  useEffect(() => {
    setSearchInput({
      query: searchString || '',
      language: searchQueryLanguage,
    });
  }, [searchQueryLanguage, searchString, queryManager.filterManager]);

  const searchHandler = ({ query, filters }: { query?: Query; filters?: Filter[] }) => {
    const mergedQuery = isDefined(query) ? query : searchInput;
    const mergedFilters = isDefined(filters) ? filters : queryManager.filterManager.getFilters();

    try {
      if (mergedFilters) {
        queryManager.filterManager.setFilters(mergedFilters);
      }

      const combinedQuery = buildEsQuery(
        dataView,
        mergedQuery ? [mergedQuery] : [],
        queryManager.filterManager.getFilters() ?? [],
        uiSettings ? getEsQueryConfig(uiSettings) : undefined
      );

      // Additional call because the search bar doesn't call onQueryChange when the query is cleared from filters
      onQueryChange?.(mergedQuery.query);
      setSearchParams({
        searchQuery: combinedQuery,
        searchString: mergedQuery.query,
        queryLanguage: mergedQuery.language as SearchQueryLanguage,
        filters: mergedFilters,
      });
    } catch (e) {
      console.log('Invalid syntax', JSON.stringify(e, null, 2)); // eslint-disable-line no-console
      toasts.addError(e, {
        title: i18n.translate('xpack.dataVisualizer.searchPanel.invalidSyntax', {
          defaultMessage: 'Invalid syntax',
        }),
      });
    }
  };

  // Debounce the onQueryChange to prevent race condition when filters are updated and both `onQuerySubmit` and `onQueryChange` are called.
  const debouncedOnQueryChange = useCallback(
    (inputQuery: Query['query'] | undefined) => {
      const debouncedFunction = debounce((debouncedQuery: Query['query'] | undefined) => {
        onQueryChange?.(debouncedQuery);
      }, 100);

      return debouncedFunction(inputQuery);
    },
    [onQueryChange]
  );

  return (
    <SearchBar
      dataTestSubj="dataVisualizerQueryInput"
      appName={'dataVisualizer'}
      showFilterBar={true}
      showDatePicker={false}
      showQueryInput={true}
      showSavedQueryControls={false}
      query={searchInput}
      onQuerySubmit={(params: { dateRange: TimeRange; query?: Query | undefined }) =>
        searchHandler({ query: params.query })
      }
      onFiltersUpdated={(filters: Filter[]) => searchHandler({ filters })}
      indexPatterns={[dataView]}
      placeholder={i18n.translate('xpack.dataVisualizer.searchPanel.queryBarPlaceholderText', {
        defaultMessage: 'Search… (e.g. status:200 AND extension:"PHP")',
      })}
      displayStyle={'inPage'}
      isClearable={true}
      customSubmitButton={<div />}
      onQueryChange={({ query }) => {
        debouncedOnQueryChange?.(query?.query);
      }}
    />
  );
};
