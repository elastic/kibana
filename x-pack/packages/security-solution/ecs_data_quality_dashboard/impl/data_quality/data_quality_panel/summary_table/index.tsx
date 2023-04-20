/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CriteriaWithPagination,
  Direction,
  EuiBasicTableColumn,
  Pagination,
} from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import numeral from '@elastic/numeral';
import React, { useCallback, useMemo, useState } from 'react';

import { EMPTY_STAT } from '../../helpers';
import type { IndexSummaryTableItem } from './helpers';
import { getShowPagination } from './helpers';

const MIN_PAGE_SIZE = 10;

interface SortConfig {
  sort: {
    direction: Direction;
    field: string;
  };
}

const defaultSort: SortConfig = {
  sort: {
    direction: 'desc',
    field: 'docsCount',
  },
};

interface Props {
  defaultNumberFormat: string;
  getTableColumns: ({
    formatNumber,
    itemIdToExpandedRowMap,
    toggleExpanded,
  }: {
    formatNumber: (value: number | undefined) => string;
    itemIdToExpandedRowMap: Record<string, React.ReactNode>;
    toggleExpanded: (indexName: string) => void;
  }) => Array<EuiBasicTableColumn<IndexSummaryTableItem>>;
  itemIdToExpandedRowMap: Record<string, React.ReactNode>;
  items: IndexSummaryTableItem[];
  toggleExpanded: (indexName: string) => void;
}

const SummaryTableComponent: React.FC<Props> = ({
  defaultNumberFormat,
  getTableColumns,
  itemIdToExpandedRowMap,
  items,
  toggleExpanded,
}) => {
  const [sorting, setSorting] = useState<SortConfig>(defaultSort);
  const formatNumber = useCallback(
    (value: number | undefined): string =>
      value != null ? numeral(value).format(defaultNumberFormat) : EMPTY_STAT,
    [defaultNumberFormat]
  );
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(MIN_PAGE_SIZE);
  const columns = useMemo(
    () => getTableColumns({ formatNumber, itemIdToExpandedRowMap, toggleExpanded }),
    [formatNumber, getTableColumns, itemIdToExpandedRowMap, toggleExpanded]
  );
  const getItemId = useCallback((item: IndexSummaryTableItem) => item.indexName, []);

  const onChange = useCallback(({ page, sort }: CriteriaWithPagination<IndexSummaryTableItem>) => {
    setSorting({ sort: sort ?? defaultSort.sort });

    setPageIndex(page.index);
    setPageSize(page.size);
  }, []);

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
      allowNeutralSort={false}
      compressed={true}
      columns={columns}
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
