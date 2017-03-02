import React from 'react';
import { KuiTableCellLink, SortableTableHeaderColumn } from 'ui_framework/components';

export const TITLE_COLUMN_ID = 'title';

export function SortableTitleHeader({ onSort, sortOrder }) {
  return <SortableTableHeaderColumn
    onSort={onSort}
    sortOrder={sortOrder}>
    Title
  </SortableTableHeaderColumn>;
}
SortableTitleHeader.propTypes = {
  sortOrder: React.PropTypes.any.isRequired,
  onSort: React.PropTypes.any
};

export function getTitleColumn(getEditUrlForItem) {
  return {
    id: TITLE_COLUMN_ID,
    isSortable: true,
    getHeaderCell: (onSort, sortOrder) => {
      return <SortableTitleHeader key={TITLE_COLUMN_ID} onSort={() => onSort(TITLE_COLUMN_ID)} sortOrder={sortOrder}/>;
    },
    getRowCell: (item) => <KuiTableCellLink
      key={item.id + TITLE_COLUMN_ID}
      title={item.title}
      href={getEditUrlForItem(item)}
    />
  };
}
