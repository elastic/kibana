/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarOnChangeArgs, EuiSearchBarProps } from '@elastic/eui';
import { EuiSearchBar } from '@elastic/eui';
import { useCallback, useMemo } from 'react';
import { useQueryState } from '../use_query_state';
import { labels } from '../../utils/i18n';

const toValidSearchQuery = (query: string | null): string => {
  try {
    const queryString = query ?? '';
    EuiSearchBar.Query.parse(queryString);
    return queryString;
  } catch (error) {
    return '';
  }
};

const getPromptsTableSearchConfig = (): EuiSearchBarProps => ({
  box: {
    incremental: true,
    placeholder: labels.prompts.searchPromptsPlaceholder,
    'data-test-subj': 'agentBuilderPromptsSearchInput',
  },
  filters: [],
});

export interface PromptsTableSearch {
  searchConfig: EuiSearchBarProps;
  searchQuery: string;
}

export interface UsePromptsTableSearchOptions {
  onSearchChange?: () => void;
}

export const usePromptsTableSearch = ({
  onSearchChange,
}: UsePromptsTableSearchOptions = {}): PromptsTableSearch => {
  const [searchQuery, setSearchQuery] = useQueryState('search', {
    defaultValue: '',
    parse: toValidSearchQuery,
  });

  const handleChange = useCallback(
    ({ queryText, error: searchError }: EuiSearchBarOnChangeArgs) => {
      if (searchError) {
        return;
      }
      if (queryText !== searchQuery) {
        // Only reset page if query actually changes
        onSearchChange?.();
      }
      setSearchQuery(queryText);
    },
    [setSearchQuery, searchQuery, onSearchChange]
  );

  const searchConfig: EuiSearchBarProps = useMemo(
    () => ({
      ...getPromptsTableSearchConfig(),
      onChange: handleChange,
      query: searchQuery,
    }),
    [handleChange, searchQuery]
  );

  return {
    searchConfig,
    searchQuery,
  };
};
