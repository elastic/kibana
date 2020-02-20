/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { sortByOrder } from 'lodash';
import React, { useMemo, useCallback, ReactNode } from 'react';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { history } from '../../../utils/history';
import { fromQuery, toQuery } from '../Links/url_helpers';

// TODO: this should really be imported from EUI
export interface ITableColumn<T> {
  name: ReactNode;
  actions?: Array<Record<string, unknown>>;
  field?: string;
  dataType?: string;
  align?: string;
  width?: string;
  sortable?: boolean;
  render?: (value: any, item: T) => unknown;
}

interface Props<T> {
  items: T[];
  columns: Array<ITableColumn<T>>;
  initialPageIndex?: number;
  initialPageSize?: number;
  initialSortField?: ITableColumn<T>['field'];
  initialSortDirection?: 'asc' | 'desc';
  hidePerPageOptions?: boolean;
  noItemsMessage?: React.ReactNode;
  sortItems?: boolean;
}

function UnoptimizedManagedTable<T>(props: Props<T>) {
  const {
    items,
    columns,
    initialPageIndex = 0,
    initialPageSize = 10,
    initialSortField = props.columns[0]?.field || '',
    initialSortDirection = 'asc',
    hidePerPageOptions = true,
    noItemsMessage,
    sortItems = true
  } = props;

  const {
    urlParams: {
      page = initialPageIndex,
      pageSize = initialPageSize,
      sortField = initialSortField,
      sortDirection = initialSortDirection
    }
  } = useUrlParams();

  const renderedItems = useMemo(() => {
    // TODO: Use _.orderBy once we upgrade to lodash 4+
    const sortedItems = sortItems
      ? sortByOrder(items, sortField, sortDirection)
      : items;

    return sortedItems.slice(page * pageSize, (page + 1) * pageSize);
  }, [page, pageSize, sortField, sortDirection, items, sortItems]);

  const sort = useMemo(() => {
    return {
      sort: {
        field: sortField as keyof T,
        direction: sortDirection as 'asc' | 'desc'
      }
    };
  }, [sortField, sortDirection]);

  const onTableChange = useCallback(
    (options: {
      page: { index: number; size: number };
      sort?: { field: keyof T; direction: 'asc' | 'desc' };
    }) => {
      history.push({
        ...history.location,
        search: fromQuery({
          ...toQuery(history.location.search),
          page: options.page.index,
          pageSize: options.page.size,
          sortField: options.sort!.field,
          sortDirection: options.sort!.direction
        })
      });
    },
    []
  );

  const pagination = useMemo(() => {
    return {
      hidePerPageOptions,
      totalItemCount: items.length,
      pageIndex: page,
      pageSize
    };
  }, [hidePerPageOptions, items, page, pageSize]);

  return (
    <EuiBasicTable
      noItemsMessage={noItemsMessage}
      items={renderedItems}
      columns={(columns as unknown) as Array<EuiBasicTableColumn<T>>} // EuiBasicTableColumn is stricter than ITableColumn
      pagination={pagination}
      sorting={sort}
      onChange={onTableChange}
    />
  );
}

const ManagedTable = React.memo(
  UnoptimizedManagedTable
) as typeof UnoptimizedManagedTable;

export { ManagedTable, UnoptimizedManagedTable };
