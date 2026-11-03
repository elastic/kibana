/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { DEFAULT_KI_PAGE_SIZE, MAX_KI_PAGE_SIZE } from '../../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import type { KiLifecycleStatus } from '../../../../../common/step_types/ki';
import { useListKi } from '../../../hooks/use_list_ki';
import { ALL_TYPE_FILTER, type ListKiTypeFilter } from './list_ki_helpers';

export const useListKiPanel = ({ id: aiIndexId }: GetAiIndexResponse) => {
  const [typeFilter, setTypeFilter] = useState<ListKiTypeFilter>(ALL_TYPE_FILTER);
  const [statusFilter, setStatusFilter] = useState<KiLifecycleStatus>('active');
  // What the search box currently displays, updated on every keystroke.
  const [searchText, setSearchText] = useState('');
  // The last string that was actually fetched; only changes via submitSearch.
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [size, setSize] = useState(DEFAULT_KI_PAGE_SIZE);

  const onTypeFilterChange = (filter: ListKiTypeFilter) => {
    setTypeFilter(filter);
    setSize(DEFAULT_KI_PAGE_SIZE);
  };

  const onStatusFilterChange = (status: KiLifecycleStatus) => {
    setStatusFilter(status);
    setSize(DEFAULT_KI_PAGE_SIZE);
  };

  const submitSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setSearchText(trimmed);
      if (trimmed === submittedQuery) {
        return;
      }
      setSubmittedQuery(trimmed);
      setSize(DEFAULT_KI_PAGE_SIZE);
    },
    [submittedQuery]
  );

  const onSearchSubmitClick = useCallback(
    () => submitSearch(searchText),
    [submitSearch, searchText]
  );

  const { kis, total, summary, isLoading, isFetching, error } = useListKi({
    aiIndexId,
    size,
    type: typeFilter.kind === 'type' ? typeFilter.value : undefined,
    query: submittedQuery.length > 0 ? submittedQuery : undefined,
    lifecycleStatus: [statusFilter],
  });

  const loadMore = () =>
    setSize((current) => Math.min(current + DEFAULT_KI_PAGE_SIZE, MAX_KI_PAGE_SIZE));

  return {
    aiIndexId,
    typeFilter,
    summary,
    onTypeFilterChange,
    statusFilter,
    onStatusFilterChange,
    searchText,
    submittedQuery,
    onSearchTextChange: setSearchText,
    onSearchSubmit: submitSearch,
    kis,
    total,
    size,
    isLoading,
    isFetching,
    error,
    loadMore,
    onSearchSubmitClick,
  };
};
