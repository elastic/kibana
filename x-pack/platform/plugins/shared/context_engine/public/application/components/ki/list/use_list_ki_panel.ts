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
  const [searchQuery, setSearchQuery] = useState('');
  const [size, setSize] = useState(DEFAULT_KI_PAGE_SIZE);

  const onTypeFilterChange = (filter: ListKiTypeFilter) => {
    setTypeFilter(filter);
    setSize(DEFAULT_KI_PAGE_SIZE);
  };

  const onStatusFilterChange = (status: KiLifecycleStatus) => {
    setStatusFilter(status);
    setSize(DEFAULT_KI_PAGE_SIZE);
  };

  const onSearch = (value: string) => {
    setSearchQuery(value);
    setSize(DEFAULT_KI_PAGE_SIZE);
  };

  const { kis, total, summary, isLoading, isFetching, error, refetch } = useListKi({
    aiIndexId,
    size,
    type: typeFilter.kind === 'type' ? typeFilter.value : undefined,
    query: searchQuery.length > 0 ? searchQuery : undefined,
    lifecycleStatus: [statusFilter],
  });

  const loadMore = () =>
    setSize((current) => Math.min(current + DEFAULT_KI_PAGE_SIZE, MAX_KI_PAGE_SIZE));

  const refreshList = useCallback(
    (committedSearchQuery: string) => {
      const trimmed = committedSearchQuery.trim();
      if (trimmed !== searchQuery) {
        onSearch(trimmed);
        return;
      }
      void refetch();
    },
    [onSearch, refetch, searchQuery]
  );

  return {
    aiIndexId,
    typeFilter,
    summary,
    onTypeFilterChange,
    statusFilter,
    onStatusFilterChange,
    searchQuery,
    onSearch,
    kis,
    total,
    size,
    isLoading,
    isFetching,
    error,
    loadMore,
    refreshList,
  };
};
