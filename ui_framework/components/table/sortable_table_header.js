import React from 'react';

import { KuiTh } from './kui_table';
import { SortAscIcon, SortDescIcon } from '../icon';
import { SortOrder } from './sort_order';

export function SortableTableHeaderColumn({ sortOrder, onSort, children }) {
  function getSortIcon() {
    switch (sortOrder) {
      case SortOrder.NONE:
        return null;
      case SortOrder.ASC:
        return <SortAscIcon />;
      case SortOrder.DESC:
        return <SortDescIcon />;
    }
  }

  return <KuiTh className={'kuiTableHeaderCell__sortable'} onClick={onSort}>
    {children}
    {getSortIcon()}
  </KuiTh>;
}

SortableTableHeaderColumn.propTypes = {
  sortOrder: React.PropTypes.string.isRequired,
  onSort: React.PropTypes.func.isRequired,
  children: React.PropTypes.any
};
