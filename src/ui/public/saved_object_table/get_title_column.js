import React from 'react';
import { KuiTableCellLink, SortableTableHeaderColumn } from 'ui_framework/components';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';

export const TITLE_COLUMN_ID = 'title';

export function SortableTitleHeader({ tableActions }) {
  return <SortableTableHeaderColumn
    onSort={() => tableActions.sort(TITLE_COLUMN_ID)}
    sortOrder={tableActions.getState().getSortOrderFor(TITLE_COLUMN_ID)}>
    Title
  </SortableTableHeaderColumn>;
}
SortableTitleHeader.propTypes = {
  tableActions: React.PropTypes.any.isRequired
};

export function getTitleColumn(tableActions, kbnUrl) {
  return {
    id: TITLE_COLUMN_ID,
    getHeaderCell: () => <SortableTitleHeader key={TITLE_COLUMN_ID} tableActions={tableActions}/>,
    getRowCell: (item) => <KuiTableCellLink
      key={item.id + TITLE_COLUMN_ID}
      title={item.title}
      href={tableActions.getState().getEditUrl(item, kbnUrl)}
    />
  };
}
