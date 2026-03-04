/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'lodash';
import { i18n } from '@kbn/i18n';

import { EuiBasicTable, EuiSkeletonText, EuiSpacer, EuiTablePagination } from '@elastic/eui';
import React, { useState, useMemo, useCallback } from 'react';

import { useKibana } from '../common/lib/kibana';
import { useUnifiedHistory } from './use_unified_history';
import { useCursorPagination } from './use_cursor_pagination';
import { useUnifiedHistoryColumns } from './unified_history_columns';
import { useBulkGetUnifiedHistoryProfiles } from './use_user_profiles';
import { usePacks } from '../packs/use_packs';
import { usePersistedPageSize, PAGE_SIZE_OPTIONS } from '../common/use_persisted_page_size';
import { HistoryFilters, DEFAULT_START_DATE, DEFAULT_END_DATE } from './components/history_filters';
import type { HistoryFilterValues } from './components/history_filters';
import type { UnifiedHistoryRow } from '../../common/api/unified_history/types';

const UnifiedHistoryTableComponent = () => {
  const { application } = useKibana().services;
  const permissions = application.capabilities.osquery;

  const [filterValues, setFilterValues] = useState<HistoryFilterValues>({
    kuery: undefined,
    selectedUserIds: [],
    sourceFilters: undefined,
    startDate: DEFAULT_START_DATE,
    endDate: DEFAULT_END_DATE,
  });

  const [pageSize, setPageSize] = usePersistedPageSize();

  const { pageIndex, currentCursors, handleNextPage, handlePrevPage, resetCursors } =
    useCursorPagination();

  const { data: packsData } = usePacks({});
  const existingPackIds = useMemo(() => map(packsData?.data ?? [], 'id'), [packsData]);

  const handleFiltersChange = useCallback(
    (values: HistoryFilterValues) => {
      setFilterValues(values);
      resetCursors();
    },
    [resetCursors]
  );

  const onChangeItemsPerPage = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize);
      resetCursors();
    },
    [setPageSize, resetCursors]
  );

  const { data, isLoading, isFetching, refetch } = useUnifiedHistory({
    pageSize,
    actionsCursor: currentCursors?.actionsCursor,
    scheduledCursor: currentCursors?.scheduledCursor,
    scheduledOffset: currentCursors?.scheduledOffset,
    kuery: filterValues.kuery,
    userIds: filterValues.selectedUserIds,
    sourceFilters: filterValues.sourceFilters,
    startDate: filterValues.startDate,
    endDate: filterValues.endDate,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const rows = data?.rows ?? [];
  const hasMore = data?.hasMore ?? false;

  const { profilesMap, isLoading: isLoadingProfiles } = useBulkGetUnifiedHistoryProfiles(rows);

  const columns = useUnifiedHistoryColumns({
    permissions,
    existingPackIds,
    profilesMap,
    isLoadingProfiles,
  });

  const onNextPage = useCallback(() => {
    if (data) {
      handleNextPage({
        nextActionsCursor: data.nextActionsCursor,
        nextScheduledCursor: data.nextScheduledCursor,
        nextScheduledOffset: data.nextScheduledOffset,
      });
    }
  }, [data, handleNextPage]);

  const onChangePage = useCallback(
    (newPageIndex: number) => {
      if (newPageIndex > pageIndex) {
        onNextPage();
      } else if (newPageIndex < pageIndex) {
        handlePrevPage();
      }
    },
    [pageIndex, onNextPage, handlePrevPage]
  );

  const pageCount = hasMore ? pageIndex + 2 : pageIndex + 1;

  const rowProps = useCallback(
    (row: UnifiedHistoryRow) => ({
      'data-test-subj': `row-${row.id}`,
    }),
    []
  );

  if (isLoading) {
    return <EuiSkeletonText lines={10} />;
  }

  return (
    <>
      <HistoryFilters
        isFetching={isFetching}
        onFiltersChange={handleFiltersChange}
        onRefresh={onRefresh}
      />
      <EuiSpacer size="m" />
      <EuiBasicTable<UnifiedHistoryRow>
        items={rows}
        loading={isFetching && !isLoading}
        columns={columns}
        rowProps={rowProps}
        data-test-subj="unifiedHistoryTable"
        tableCaption={i18n.translate('xpack.osquery.unifiedHistory.table.tableCaption', {
          defaultMessage: 'Query history',
        })}
      />
      <EuiTablePagination
        activePage={pageIndex}
        pageCount={pageCount}
        onChangePage={onChangePage}
        itemsPerPage={pageSize}
        itemsPerPageOptions={PAGE_SIZE_OPTIONS as unknown as number[]}
        onChangeItemsPerPage={onChangeItemsPerPage}
        data-test-subj="unifiedHistoryPagination"
      />
    </>
  );
};

export const UnifiedHistoryTable = React.memo(UnifiedHistoryTableComponent);
UnifiedHistoryTable.displayName = 'UnifiedHistoryTable';
