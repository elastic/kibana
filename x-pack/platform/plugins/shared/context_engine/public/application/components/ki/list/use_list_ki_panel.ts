/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_KI_PAGE_SIZE } from '../../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import type { KiListItem } from '../../../../../common/http_api/knowledge_indicators';
import { useListKi } from '../../../hooks/use_list_ki';
import { useListKiByType } from '../../../hooks/use_list_ki_by_type';
import { useSelectedKi, type SelectedKi } from '../../../hooks/use_selected_ki';
import {
  ALL_TYPE_FILTER,
  DEFAULT_SORT,
  DEFAULT_STATUS_FILTER,
  getLifecycleStatusesForFilter,
  type ListKiStatusFilterValue,
  type ListKiTypeFilter,
} from './list_ki_helpers';
import { buildListKiGroups, getNextGroupSize } from './list_ki_groups_helpers';

const EMPTY_GROUP_SIZES: Record<string, number> = {};

const isSameKi = (ki: KiListItem, { kiId, index }: SelectedKi): boolean =>
  ki.id === kiId && (index.length === 0 || ki.index === index);

export const useListKiPanel = ({ id: aiIndexId }: GetAiIndexResponse) => {
  const [typeFilter, setTypeFilter] = useState<ListKiTypeFilter>(ALL_TYPE_FILTER);
  const [statusFilter, setStatusFilter] = useState<ListKiStatusFilterValue>(DEFAULT_STATUS_FILTER);
  // What the search box currently displays, updated on every keystroke.
  const [searchText, setSearchText] = useState('');
  // The last string that was actually fetched; only changes via submitSearch.
  const [submittedQuery, setSubmittedQuery] = useState('');
  // "Show more" page size per type. Reset when a filter changes.
  const [groupSizes, setGroupSizes] = useState<Record<string, number>>(EMPTY_GROUP_SIZES);

  const resetGroupSizes = () => setGroupSizes(EMPTY_GROUP_SIZES);

  const onTypeFilterChange = (filter: ListKiTypeFilter) => {
    setTypeFilter(filter);
    resetGroupSizes();
  };

  const onStatusFilterChange = (status: ListKiStatusFilterValue) => {
    setStatusFilter(status);
    resetGroupSizes();
  };

  const submitSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed === submittedQuery) {
        return;
      }
      setSubmittedQuery(trimmed);
      setGroupSizes(EMPTY_GROUP_SIZES);
    },
    [submittedQuery]
  );

  const hasActiveFilters =
    typeFilter.kind === 'type' ||
    statusFilter !== DEFAULT_STATUS_FILTER ||
    submittedQuery.length > 0;

  const clearFilters = () => {
    setTypeFilter(ALL_TYPE_FILTER);
    setStatusFilter(DEFAULT_STATUS_FILTER);
    setSearchText('');
    setSubmittedQuery('');
    resetGroupSizes();
  };

  const query = submittedQuery.length > 0 ? submittedQuery : undefined;
  const lifecycleStatus = useMemo(
    () => getLifecycleStatusesForFilter(statusFilter),
    [statusFilter]
  );

  const { kis, total, summary, isLoading, isFetching, error } = useListKi({
    aiIndexId,
    size: DEFAULT_KI_PAGE_SIZE,
    type: typeFilter.kind === 'type' ? typeFilter.value : undefined,
    query,
    lifecycleStatus,
  });

  const groupResults = useListKiByType({
    aiIndexId,
    sizesByType: groupSizes,
    query,
    lifecycleStatus,
  });

  const groups = useMemo(
    () =>
      buildListKiGroups({
        kis,
        total,
        countsByType: summary.countsByType,
        typeFilter,
        groupResults,
      }),
    [groupResults, kis, summary.countsByType, total, typeFilter]
  );

  const showMore = useCallback((type: string, loadedCount: number) => {
    setGroupSizes((current) => ({ ...current, [type]: getNextGroupSize(loadedCount) }));
  }, []);

  // Rows in the order the list shows them. The first one opens when nothing is selected.
  const visibleKis = useMemo(() => groups.flatMap((group) => group.kis), [groups]);
  const { selectedKi, selectKi } = useSelectedKi();

  // A filter change re-checks the selection once the new list has loaded.
  const filterKey = `${typeFilter.value}|${statusFilter}|${submittedQuery}`;
  const checkedFilterKeyRef = useRef(filterKey);

  useEffect(() => {
    if (isLoading || isFetching) {
      return;
    }
    const [firstKi] = visibleKis;
    const filtersChanged = checkedFilterKeyRef.current !== filterKey;
    checkedFilterKeyRef.current = filterKey;

    if (!firstKi) {
      return;
    }
    if (!selectedKi) {
      selectKi(firstKi, { replace: true });
      return;
    }
    // Deep links keep their document. Only a filter that hides it opens the first one.
    if (filtersChanged && !visibleKis.some((ki) => isSameKi(ki, selectedKi))) {
      selectKi(firstKi, { replace: true });
    }
  }, [filterKey, isFetching, isLoading, selectKi, selectedKi, visibleKis]);

  // Old links may miss the backing index. Take it from the list when the document is there.
  const resolvedSelectedKi = useMemo((): SelectedKi | undefined => {
    if (!selectedKi || selectedKi.index.length > 0) {
      return selectedKi;
    }
    const listedKi = visibleKis.find((ki) => ki.id === selectedKi.kiId);
    return listedKi ? { kiId: selectedKi.kiId, index: listedKi.index } : selectedKi;
  }, [selectedKi, visibleKis]);

  return {
    aiIndexId,
    typeFilter,
    summary,
    onTypeFilterChange,
    statusFilter,
    onStatusFilterChange,
    // WIP: needs list API sort/expired (#305092). Always "Recently updated" until then.
    sort: DEFAULT_SORT,
    searchText,
    submittedQuery,
    onSearchTextChange: setSearchText,
    onSearchSubmit: submitSearch,
    hasActiveFilters,
    clearFilters,
    groups,
    showMore,
    selectedKi: resolvedSelectedKi,
    selectKi,
    isLoading,
    isFetching,
    error,
  };
};
