/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiBasicTable, EuiSpacer, EuiSearchBar, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIdentifier } from '../setup_mode/formatting';
import { isSetupModeFeatureEnabled } from '../../lib/setup_mode';
import { SetupModeFeature } from '../../../common/enums';

export function EuiMonitoringSSPTable({
  rows: items,
  search = {},
  pagination,
  columns: _columns,
  onTableChange,
  setupMode,
  productName,
  ...props
}) {
  const [queryText, setQueryText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
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

  const columns = _columns.map((column) => {
    if (!('sortable' in column)) {
      column.sortable = true;
    }

    return column;
  });

  let footerContent = null;
  if (
    setupMode &&
    setupMode.enabled &&
    isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)
  ) {
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
    // angular version
    if (props.fetchMoreData) {
      setIsLoading(true);
      await props.fetchMoreData({ page, sort: { sort }, queryText });
      setIsLoading(false);
      onTableChange({ page, sort });
    }
    // react version
    else {
      onTableChange({ page, sort, queryText });
    }
  };

  const onQueryChange = async ({ queryText }) => {
    const newPage = { ...page, index: 0 };
    setPage(newPage);
    setQueryText(queryText);
    // angular version
    if (props.fetchMoreData) {
      setIsLoading(true);
      await props.fetchMoreData({ page: newPage, sort, queryText });
      setIsLoading(false);
    } else {
      // react version
      onTableChange({ page, sort: sort.sort, queryText });
    }
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
        columns={columns}
        loading={props.isLoading || isLoading}
      />
      {footerContent}
    </div>
  );
}
