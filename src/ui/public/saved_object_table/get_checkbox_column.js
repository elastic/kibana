import React from 'react';
import { CheckBoxTableCell, CheckBoxTableHeader } from 'ui_framework/components';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';

export const CHECKBOX_COLUMN_ID = 'checkBoxColumn';

export function getCheckBoxColumn(itemTableState) {
  return {
    id: 'checkBoxColumn',
    getHeaderCell: () => {
      return <CheckBoxTableHeader
        key={CHECKBOX_COLUMN_ID}
        onClick={() => ItemTableActions.toggleAll(itemTableState)}
        isChecked={itemTableState.areAllItemsSelected()} />;
    },
    getRowCell: (item) => <CheckBoxTableCell
      key={item.id + CHECKBOX_COLUMN_ID}
      onClick={() => ItemTableActions.toggleItem(itemTableState, item)}
      isChecked={itemTableState.isItemSelected(item)} />,
    isSortable: false
  };
}
