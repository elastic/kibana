/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiBasicTable, EuiSpacer, EuiSearchBar, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIdentifier } from '../setup_mode/formatting';

export function EuiMonitoringSSPTable({
  rows: items,
  search = {},
  pagination,
  columns: _columns,
  onTableChange,
  setupMode,
  productName,
  fetchMoreData,
  ...props
}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [queryText, setQueryText] = React.useState('');
  const [page, setPage] = React.useState({
    index: pagination.pageIndex,
    size: pagination.pageSize,
  });

  if (!pagination.totalItemCount) {
    pagination.totalItemCount = (items && items.length) || 0;
  }

  const [sort, setSort] = React.useState(props.sorting);

  if (search.box && !search.box['data-test-subj']) {
    search.box['data-test-subj'] = 'monitoringTableToolBar';
  }

  const columns = _columns.map(column => {
    if (!('sortable' in column)) {
      column.sortable = true;
    }

    return column;
  });

  let footerContent = null;
  if (setupMode && setupMode.enabled) {
    footerContent = (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiButton iconType="flag" onClick={() => setupMode.openFlyout({}, true)}>
          {i18n.translate('xpack.monitoring.euiSSPTable.setupNewButtonLabel', {
            defaultMessage: 'Set up monitoring for new {identifier}',
            values: {
              identifier: getIdentifier(productName),
            },
          })}
        </EuiButton>
      </Fragment>
    );
  }

  const onChange = async ({ page, sort }) => {
    setPage(page);
    setSort({ sort });
    setIsLoading(true);
    await fetchMoreData({ page, sort: { sort }, queryText });
    setIsLoading(false);
    onTableChange({ page, sort });
  };

  const onQueryChange = async ({ queryText }) => {
    const newPage = { ...page, index: 0 };
    setPage(newPage);
    setQueryText(queryText);
    setIsLoading(true);
    await fetchMoreData({ page: newPage, sort, queryText });
    setIsLoading(false);
  };

  return (
    <div data-test-subj={`${props.className}Container`}>
      <EuiSearchBar {...search} onChange={onQueryChange} />
      <EuiSpacer size="l" />
      <EuiBasicTable
        {...props}
        data-test-subj={items.length ? 'monitoringTableHasData' : 'monitoringTableNoData'}
        items={items}
        pagination={pagination}
        onChange={onChange}
        loading={isLoading}
        columns={columns}
      />
      {footerContent}
    </div>
  );
}
