/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiBasicTableColumn, Pagination } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { defaultSort } from '../../../../constants';
import { IndexSummaryTableItem, SortConfig } from '../../../../types';
import { useDataQualityContext } from '../../../../data_quality_context';
import { UseIndicesCheckCheckState } from '../../../../hooks/use_indices_check/types';
import { MIN_PAGE_SIZE } from '../constants';
import { getShowPagination } from './utils/get_show_pagination';

export interface Props {
  getTableColumns: ({
    formatBytes,
    formatNumber,
    checkState,
    isILMAvailable,
    pattern,
    onExpandAction,
    onCheckNowAction,
  }: {
    formatBytes: (value: number | undefined) => string;
    formatNumber: (value: number | undefined) => string;
    checkState: UseIndicesCheckCheckState;
    isILMAvailable: boolean;
    pattern: string;
    onExpandAction: (indexName: string) => void;
    onCheckNowAction: (indexName: string) => void;
  }) => Array<EuiBasicTableColumn<IndexSummaryTableItem>>;
  items: IndexSummaryTableItem[];
  pageIndex: number;
  pageSize: number;
  pattern: string;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
  setSorting: (sortConfig: SortConfig) => void;
  sorting: SortConfig;
  onExpandAction: (indexName: string) => void;
  onCheckNowAction: (indexName: string) => void;
  checkState: UseIndicesCheckCheckState;
}

const SummaryTableComponent: React.FC<Props> = ({
  getTableColumns,
  items,
  pageIndex,
  pageSize,
  pattern,
  setPageIndex,
  setPageSize,
  setSorting,
  sorting,
  onExpandAction,
  onCheckNowAction,
  checkState,
}) => {
  const { isILMAvailable, formatBytes, formatNumber } = useDataQualityContext();
  const columns = useMemo(
    () =>
      getTableColumns({
        formatBytes,
        formatNumber,
        checkState,
        isILMAvailable,
        pattern,
        onExpandAction,
        onCheckNowAction,
      }),
    [
      formatBytes,
      formatNumber,
      getTableColumns,
      checkState,
      isILMAvailable,
      onCheckNowAction,
      onExpandAction,
      pattern,
    ]
  );
  const getItemId = useCallback((item: IndexSummaryTableItem) => item.indexName, []);

  const onChange = useCallback(
    ({ page, sort }: CriteriaWithPagination<IndexSummaryTableItem>) => {
      setSorting({ sort: sort ?? defaultSort.sort });
      setPageIndex(page.index);
      setPageSize(page.size);
    },
    [setPageIndex, setPageSize, setSorting]
  );

  const pagination: Pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      showPerPageOptions: true,
      totalItemCount: items.length,
    }),
    [items, pageIndex, pageSize]
  );

  return (
    <EuiInMemoryTable
      allowNeutralSort={true}
      compressed={true}
      columns={columns}
      data-test-subj="summaryTable"
      itemId={getItemId}
      items={items}
      onChange={onChange}
      pagination={
        getShowPagination({ minPageSize: MIN_PAGE_SIZE, totalItemCount: items.length })
          ? pagination
          : undefined
      }
      sorting={sorting}
    />
  );
};

SummaryTableComponent.displayName = 'SummaryTableComponent';

export const SummaryTable = React.memo(SummaryTableComponent);
