/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiSpacer,
  EuiSearchBar
} from '@elastic/eui';

export function EuiMonitoringSSPTable({
  rows: items,
  search = {},
  pagination,
  columns: _columns,
  onTableChange,
  fetchMoreData,
  ...props
}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [queryText, setQueryText] = React.useState('');
  const [page, setPage] = React.useState({
    index: pagination.pageIndex,
    size: pagination.pageSize
  });
  const [sort, setSort] = React.useState(props.sorting);

  if (search.box && !search.box['data-test-subj']) {
    search.box['data-test-subj'] = 'monitoringTableToolBar';
  }

  const columns = _columns.map(column => {
    if (!column['data-test-subj']) {
      column['data-test-subj'] = 'monitoringTableHasData';
    }

    if (!('sortable' in column)) {
      column.sortable = true;
    }

    return column;
  });

  const onChange = async ({ page, sort }) => {
    setPage(page);
    setSort({ sort });
    setIsLoading(true);
    await fetchMoreData({ page, sort: { sort }, queryText });
    setIsLoading(false);
    onTableChange({ page, sort });
  };

  const onQueryChange = async ({ queryText }) => {
    setQueryText(queryText);
    setIsLoading(true);
    await fetchMoreData({ page, sort, queryText });
    setIsLoading(false);
  };

  return (
    <div data-test-subj={`${props.className}Container`}>
      <EuiSearchBar {...search} onChange={onQueryChange}/>
      <EuiSpacer size="l"/>
      <EuiBasicTable
        {...props}
        items={items}
        pagination={pagination}
        onChange={onChange}
        loading={isLoading}
        columns={columns}
      />
    </div>
  );
}
