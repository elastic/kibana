/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiInMemoryTable,
  EuiSearchBar
} from '@elastic/eui';

export function EuiMonitoringTable({
  rows: items,
  search = {},
  columns: _columns,
  ...props
}) {

  const [hasItems, setHasItem] = React.useState(items.length > 0);

  if (search.box && !search.box['data-test-subj']) {
    search.box['data-test-subj'] = 'monitoringTableToolBar';
  }

  if (search.box && !search.box.schema) {
    search.box.schema = true;
  }

  if (search) {
    const oldOnChange = search.onChange;
    search.onChange = (arg) => {
      const filteredItems = EuiSearchBar.Query.execute(arg.query, items, props.executeQueryOptions);
      setHasItem(filteredItems.length > 0);
      oldOnChange && oldOnChange(arg);
      return true;
    };
  }

  const columns = _columns.map(column => {
    if (!('sortable' in column)) {
      column.sortable = true;
    }
    return column;
  });

  return (
    <div data-test-subj={`${props.className}Container`}>
      <EuiInMemoryTable
        data-test-subj={items.length && hasItems === true ? 'monitoringTableHasData' : 'monitoringTableNoData'}
        items={items}
        search={search}
        columns={columns}
        {...props}
      />
    </div>
  );
}
