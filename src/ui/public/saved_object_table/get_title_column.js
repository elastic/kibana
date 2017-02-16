import React from 'react';
import { KuiTableCellLink, SortableTableHeaderColumn } from 'ui_framework/components';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';

export const TITLE_COLUMN_ID = 'title';

export function SortableTitleHeader({ itemTableState }) {
  return <SortableTableHeaderColumn
    onSort={() => ItemTableActions.doSort(itemTableState, TITLE_COLUMN_ID)}
    sortOrder={itemTableState.getSortOrderFor(TITLE_COLUMN_ID)}>
    Title
  </SortableTableHeaderColumn>;
}
SortableTitleHeader.propTypes = {
  itemTableState: React.PropTypes.any.isRequired
};

export function getTitleColumn(itemTableState) {
  return {
    id: TITLE_COLUMN_ID,
    getHeaderCell: () => <SortableTitleHeader key={TITLE_COLUMN_ID} itemTableState={itemTableState}/>,
    getRowCell: (item) => <KuiTableCellLink
      key={item.id + TITLE_COLUMN_ID}
      title={item.title}
      href={itemTableState.getEditUrl(item)}
    />
  };
}
