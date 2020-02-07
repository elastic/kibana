/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This component extends EuiInMemoryTable with some
// fixes and TS specs until the changes become available upstream.

import React, { Fragment } from 'react';

import { EuiProgress } from '@elastic/eui';

import { mlInMemoryTableBasicFactory } from '../../../../../shared_imports';

// The built in loading progress bar of EuiInMemoryTable causes a full DOM replacement
// of the table and doesn't play well with auto-refreshing. That's why we're displaying
// our own progress bar on top of the table. `EuiProgress` after `isLoading` displays
// the loading indicator. The variation after `!isLoading` displays an empty progress
// bar fixed to 0%. Without it, the display would vertically jump when showing/hiding
// the progress bar.
export const ProgressBar = ({ isLoading = false }) => {
  return (
    <Fragment>
      {isLoading && <EuiProgress className="transform__ProgressBar" size="xs" color="primary" />}
      {!isLoading && (
        <EuiProgress className="transform__ProgressBar" value={0} max={100} size="xs" />
      )}
    </Fragment>
  );
};

// copied from EUI to be available to the extended getDerivedStateFromProps()
function findColumnByProp(columns: any, prop: any, value: any) {
  for (let i = 0; i < columns.length; i++) {
    const column = columns[i];
    if (column[prop] === value) {
      return column;
    }
  }
}

// copied from EUI to be available to the extended getDerivedStateFromProps()
const getInitialSorting = (columns: any, sorting: any) => {
  if (!sorting || !sorting.sort) {
    return {
      sortName: undefined,
      sortDirection: undefined,
    };
  }

  const { field: sortable, direction: sortDirection } = sorting.sort;

  // sortable could be a column's `field` or its `name`
  // for backwards compatibility `field` must be checked first
  let sortColumn = findColumnByProp(columns, 'field', sortable);
  if (sortColumn == null) {
    sortColumn = findColumnByProp(columns, 'name', sortable);
  }

  if (sortColumn == null) {
    return {
      sortName: undefined,
      sortDirection: undefined,
    };
  }

  const sortName = sortColumn.name;

  return {
    sortName,
    sortDirection,
  };
};

export function transformTableFactory<T>() {
  const MlInMemoryTableBasic = mlInMemoryTableBasicFactory<T>();
  return class TransformTable extends MlInMemoryTableBasic {
    static getDerivedStateFromProps(nextProps: any, prevState: any) {
      const derivedState = {
        ...prevState.prevProps,
        pageIndex: nextProps.pagination.initialPageIndex,
        pageSize: nextProps.pagination.initialPageSize,
      };

      if (nextProps.items !== prevState.prevProps.items) {
        Object.assign(derivedState, {
          prevProps: {
            items: nextProps.items,
          },
        });
      }

      const { sortName, sortDirection } = getInitialSorting(nextProps.columns, nextProps.sorting);
      if (
        sortName !== prevState.prevProps.sortName ||
        sortDirection !== prevState.prevProps.sortDirection
      ) {
        Object.assign(derivedState, {
          sortName,
          sortDirection,
        });
      }
      return derivedState;
    }
  };
}
