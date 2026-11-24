/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_KI_GROUPS, MAX_KI_GROUPS } from '../../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import type { KiGroup, KiListItem } from '../../../../../common/http_api/knowledge_indicators';
import { DEFAULT_KI_LIST_SORT, type KiListSort } from '../../../../../common/ki_list_sort';
import { useListKi } from '../../../hooks/use_list_ki';
import { useListKiByType } from '../../../hooks/use_list_ki_by_type';
import { useListKiGroups } from '../../../hooks/use_list_ki_groups';
import { useSelectedKi, type SelectedKi } from '../../../hooks/use_selected_ki';
import {
  DEFAULT_STATUS_FILTER,
  getStatusesForFilter,
  type ListKiStatusFilterValue,
} from './list_ki_helpers';
import {
  EMPTY_TILE_SELECTION,
  LIST_KI_PAGE_SIZE,
  OTHER_SECTION_KEY,
  getOwnValue,
  buildListKiSections,
  getNextGroupSize,
  hasTileSelection,
  isOtherSectionShown,
  type ListKiTileSelection,
} from './list_ki_groups_helpers';
import {
  buildTiles,
  getEffectiveSelection,
  getSelectionKey,
  toggleTile,
  type ListKiTile,
} from './list_ki_tiles_helpers';

const EMPTY_GROUP_SIZES: Record<string, number> = {};
/** The groups part of a `_groups` answer, as the list uses it. */
interface ListKiGroupsSnapshot {
  groups: KiGroup[];
  total: number;
  totalOther: number;
}

const isSameKi = (ki: KiListItem, { kiId, index }: SelectedKi): boolean =>
  ki.id === kiId && (index.length === 0 || ki.index === index);

export const useListKiPanel = ({ id: aiIndexId }: GetAiIndexResponse) => {
  const [statusFilter, setStatusFilter] = useState<ListKiStatusFilterValue>(DEFAULT_STATUS_FILTER);
  const [sort, setSort] = useState<KiListSort>(DEFAULT_KI_LIST_SORT);
  // What the search box currently displays, updated on every keystroke.
  const [searchText, setSearchText] = useState('');
  // The last string that was actually fetched; only changes via submitSearch.
  const [submittedQuery, setSubmittedQuery] = useState('');
  // Raw tile selection. Types that are no tile right now are ignored, not dropped.
  const [tileSelection, setTileSelection] = useState<ListKiTileSelection>(EMPTY_TILE_SELECTION);
  // Rows per type section beyond the preview ("Show more"). Reset on a filter change.
  const [groupSizes, setGroupSizes] = useState<Record<string, number>>(EMPTY_GROUP_SIZES);
  const [otherSize, setOtherSize] = useState(LIST_KI_PAGE_SIZE);

  const resetSizes = () => {
    setGroupSizes(EMPTY_GROUP_SIZES);
    setOtherSize(LIST_KI_PAGE_SIZE);
  };

  const onStatusFilterChange = (status: ListKiStatusFilterValue) => {
    setStatusFilter(status);
    resetSizes();
  };

  // Sort is not a filter: "Clear filters" keeps it.
  const onSortChange = (nextSort: KiListSort) => {
    setSort(nextSort);
    resetSizes();
  };

  const submitSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed === submittedQuery) {
        return;
      }
      setSubmittedQuery(trimmed);
      setGroupSizes(EMPTY_GROUP_SIZES);
      setOtherSize(LIST_KI_PAGE_SIZE);
    },
    [submittedQuery]
  );

  const query = submittedQuery.length > 0 ? submittedQuery : undefined;
  const status = useMemo(() => getStatusesForFilter(statusFilter), [statusFilter]);

  // The tile set: the biggest types without the search, so the tiles stay while the user types.
  // Without a search this one request also feeds the list.
  const tileGroupsQuery = useListKiGroups({
    aiIndexId,
    maxGroups: DEFAULT_KI_GROUPS,
    previewSize: LIST_KI_PAGE_SIZE,
    status,
    sort,
  });
  const tileTypes = useMemo(
    () => tileGroupsQuery.groups.map(({ type }) => type),
    [tileGroupsQuery.groups]
  );

  // With a search: the same types as groups, with counts and rows that match the search.
  const isSearching = query !== undefined;
  const searchGroupsQuery = useListKiGroups({
    aiIndexId,
    maxGroups: DEFAULT_KI_GROUPS,
    types: tileTypes,
    previewSize: LIST_KI_PAGE_SIZE,
    query,
    status,
    sort,
    enabled: isSearching && !tileGroupsQuery.isLoading && !tileGroupsQuery.isPreviousData,
  });
  // The last search answer, kept only while searching. A new search keeps showing it until its
  // own answer arrives; after the search is cleared it is dropped. (`keepPreviousData` alone
  // would bring back the answer of a search from before the clear.)
  const lastSearchAnswerRef = useRef<ListKiGroupsSnapshot | undefined>(undefined);
  if (!isSearching) {
    lastSearchAnswerRef.current = undefined;
  } else if (!searchGroupsQuery.isLoading && !searchGroupsQuery.isPreviousData) {
    lastSearchAnswerRef.current = {
      groups: searchGroupsQuery.groups,
      total: searchGroupsQuery.total,
      totalOther: searchGroupsQuery.totalOther,
    };
  }
  const { groups, total, totalOther }: ListKiGroupsSnapshot =
    (isSearching ? lastSearchAnswerRef.current : undefined) ?? tileGroupsQuery;
  const isLoading = tileGroupsQuery.isLoading;
  const isFetchingGroups =
    tileGroupsQuery.isFetching || (isSearching && searchGroupsQuery.isFetching);
  const error = tileGroupsQuery.error ?? (isSearching ? searchGroupsQuery.error : undefined);

  const tiles = useMemo(
    () =>
      buildTiles(
        tileGroupsQuery.groups,
        tileGroupsQuery.totalOther,
        isSearching ? { groups, totalOther } : undefined
      ),
    [groups, isSearching, tileGroupsQuery.groups, tileGroupsQuery.totalOther, totalOther]
  );
  const selection = useMemo(
    () => getEffectiveSelection(tileSelection, tiles),
    [tileSelection, tiles]
  );

  const groupResults = useListKiByType({
    aiIndexId,
    sizesByType: groupSizes,
    query,
    status,
    sort,
  });

  // "Other" = everything outside the tile types (with or without the search).
  const showOther = isOtherSectionShown(groups, totalOther, selection);
  // "Other" waits for fresh tiles: with the previous ones it would exclude the wrong types.
  const isOtherReady = showOther && !isLoading && !tileGroupsQuery.isPreviousData;
  // "Other" keeps the real types: its biggest types come as groups of their own.
  const otherGroupsQuery = useListKiGroups({
    aiIndexId,
    maxGroups: MAX_KI_GROUPS,
    excludeTypes: tileTypes,
    previewSize: LIST_KI_PAGE_SIZE,
    query,
    status,
    sort,
    enabled: isOtherReady,
  });
  const areOtherGroupsFresh =
    isOtherReady && !otherGroupsQuery.isLoading && !otherGroupsQuery.isPreviousData;
  // The previous groups stay while new ones load, also while the tiles reload (the query is then
  // disabled but keeps its data). After an error "Other" is one flat section.
  const otherGroups =
    showOther && !otherGroupsQuery.isLoading && !otherGroupsQuery.error
      ? otherGroupsQuery.groups
      : undefined;
  const otherRestCount = otherGroups ? otherGroupsQuery.totalOther : totalOther;
  const otherExcludeTypes = useMemo(
    () => [...tileTypes, ...(otherGroups ?? []).map(({ type }) => type)],
    [otherGroups, tileTypes]
  );
  // The rest of "Other" (types past the "Other" groups, no type) waits for fresh groups too.
  const otherQuery = useListKi({
    aiIndexId,
    size: otherSize,
    excludeTypes: otherExcludeTypes,
    query,
    status,
    sort,
    enabled: areOtherGroupsFresh && otherRestCount > 0,
    // A failed "Other" page shows a toast; its "Show more" then asks again.
    notifyOnError: true,
  });
  const isFetchingOther = showOther && (otherGroupsQuery.isFetching || otherQuery.isFetching);
  // Previous rows stay while the next page loads ("Show more", a filter change). Rows of types
  // that are now groups of their own are dropped, so no row shows twice.
  const otherKis = useMemo(() => {
    if (!otherQuery.isPreviousData) {
      return otherQuery.kis;
    }
    const excluded = new Set(otherExcludeTypes);
    return otherQuery.kis.filter(({ type }) => type === undefined || !excluded.has(type));
  }, [otherExcludeTypes, otherQuery.isPreviousData, otherQuery.kis]);

  // The preview is already a full page, so a tile click loads nothing extra.
  const onToggleTile = useCallback((tile: ListKiTile) => {
    setTileSelection((current) => toggleTile(current, tile));
  }, []);

  const hasActiveFilters =
    hasTileSelection(selection) ||
    statusFilter !== DEFAULT_STATUS_FILTER ||
    submittedQuery.length > 0;

  const clearFilters = () => {
    setTileSelection(EMPTY_TILE_SELECTION);
    setStatusFilter(DEFAULT_STATUS_FILTER);
    setSearchText('');
    setSubmittedQuery('');
    resetSizes();
  };

  const sections = useMemo(
    () =>
      buildListKiSections({
        groups,
        totalOther,
        groupResults,
        other: {
          ...(otherGroups ? { byType: { groups: otherGroups, restCount: otherRestCount } } : {}),
          kis: otherKis,
          // Unknown while loading or after an error: the count from the groups is used instead,
          // so "Other" keeps its "Show more" (which retries after an error).
          total:
            otherQuery.isPreviousData || otherQuery.isLoading || otherQuery.error
              ? undefined
              : otherQuery.total,
          isFetching: isFetchingOther,
        },
        selection,
        typeOrder: tileTypes,
      }),
    [
      groupResults,
      groups,
      isFetchingOther,
      otherGroups,
      otherKis,
      otherQuery.error,
      otherQuery.isLoading,
      otherQuery.isPreviousData,
      otherQuery.total,
      otherRestCount,
      selection,
      tileTypes,
      totalOther,
    ]
  );

  const { refetch: refetchOther, error: otherError } = otherQuery;
  const showMore = useCallback(
    (key: string, loadedCount: number) => {
      if (key === OTHER_SECTION_KEY) {
        // After a failed "Show more" the next size would be the same, so ask again instead.
        if (otherError) {
          refetchOther();
          return;
        }
        setOtherSize(getNextGroupSize(loadedCount));
        return;
      }
      const section = sections.find((candidate) => candidate.key === key);
      if (!section) {
        return;
      }
      const groupResult = getOwnValue(groupResults, section.type);
      if (groupResult?.isError) {
        groupResult.retry();
        return;
      }
      setGroupSizes((current) => ({
        ...current,
        [section.type]: getNextGroupSize(loadedCount),
      }));
    },
    [groupResults, otherError, refetchOther, sections]
  );

  // Rows in the order the list shows them. The first one opens when nothing is selected.
  const visibleKis = useMemo(() => sections.flatMap((section) => section.kis), [sections]);
  const { selectedKi, selectKi, clearSelectedKi } = useSelectedKi();

  // A filter or tile change re-checks the selection once the new list has loaded.
  const filterKey = `${statusFilter}|${submittedQuery}|${getSelectionKey(selection)}`;
  const checkedFilterKeyRef = useRef(filterKey);

  useEffect(() => {
    // Also wait for "Other": its rows arrive after the tile click.
    if (isLoading || isFetchingGroups || isFetchingOther) {
      return;
    }
    const [firstKi] = visibleKis;
    const filtersChanged = checkedFilterKeyRef.current !== filterKey;
    checkedFilterKeyRef.current = filterKey;

    if (!firstKi) {
      // A filter that leaves the list empty also closes the open document. A failed request
      // is not an empty list: the document stays.
      if (filtersChanged && selectedKi && !error && !otherError) {
        clearSelectedKi();
      }
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
  }, [
    clearSelectedKi,
    error,
    filterKey,
    isFetchingGroups,
    isFetchingOther,
    isLoading,
    otherError,
    selectKi,
    selectedKi,
    visibleKis,
  ]);

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
    total,
    tiles,
    selection,
    onToggleTile,
    statusFilter,
    onStatusFilterChange,
    sort,
    onSortChange,
    searchText,
    submittedQuery,
    onSearchTextChange: setSearchText,
    onSearchSubmit: submitSearch,
    hasActiveFilters,
    clearFilters,
    groups: sections,
    showMore,
    selectedKi: resolvedSelectedKi,
    selectKi,
    isLoading,
    isFetching: isFetchingGroups || isFetchingOther,
    error,
  };
};
