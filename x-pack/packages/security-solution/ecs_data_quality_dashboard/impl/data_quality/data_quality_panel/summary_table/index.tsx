/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiBasicTableColumn, Pagination } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import type { IndexSummaryTableItem } from './helpers';
import { getShowPagination } from './helpers';
import { defaultSort, MIN_PAGE_SIZE } from '../pattern/helpers';
import { SortConfig } from '../../types';
import { useDataQualityContext } from '../data_quality_context';

export interface Props {
  formatBytes: (value: number | undefined) => string;
  formatNumber: (value: number | undefined) => string;
  getTableColumns: ({
    formatBytes,
    formatNumber,
    itemIdToExpandedRowMap,
    isILMAvailable,
    pattern,
    toggleExpanded,
  }: {
    formatBytes: (value: number | undefined) => string;
    formatNumber: (value: number | undefined) => string;
    itemIdToExpandedRowMap: Record<string, React.ReactNode>;
    isILMAvailable: boolean;
    pattern: string;
    toggleExpanded: (indexName: string) => void;
  }) => Array<EuiBasicTableColumn<IndexSummaryTableItem>>;
  itemIdToExpandedRowMap: Record<string, React.ReactNode>;
  items: IndexSummaryTableItem[];
  pageIndex: number;
  pageSize: number;
  pattern: string;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
  setSorting: (sortConfig: SortConfig) => void;
  sorting: SortConfig;
  toggleExpanded: (indexName: string) => void;
}

const SummaryTableComponent: React.FC<Props> = ({
  formatBytes,
  formatNumber,
  getTableColumns,
  itemIdToExpandedRowMap,
  items,
  pageIndex,
  pageSize,
  pattern,
  setPageIndex,
  setPageSize,
  setSorting,
  sorting,
  toggleExpanded,
}) => {
  const { isILMAvailable } = useDataQualityContext();
  const columns = useMemo(
    () =>
      getTableColumns({
        formatBytes,
        formatNumber,
        itemIdToExpandedRowMap,
        isILMAvailable,
        pattern,
        toggleExpanded,
      }),
    [
      formatBytes,
      formatNumber,
      getTableColumns,
      isILMAvailable,
      itemIdToExpandedRowMap,
      pattern,
      toggleExpanded,
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
      isExpandable={true}
      itemId={getItemId}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
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
