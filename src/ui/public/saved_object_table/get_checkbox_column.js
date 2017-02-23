import React from 'react';
import { CheckBoxTableCell, CheckBoxTableHeader } from 'ui_framework/components';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';

export const CHECKBOX_COLUMN_ID = 'checkBoxColumn';

export function getCheckBoxColumn(tableActions) {
  return {
    id: 'checkBoxColumn',
    getHeaderCell: () => {
      return <CheckBoxTableHeader
        key={CHECKBOX_COLUMN_ID}
        onClick={() => tableActions.toggleAll()}
        isChecked={tableActions.getState().areAllItemsSelected()} />;
    },
    getRowCell: (item) => <CheckBoxTableCell
      key={item.id + CHECKBOX_COLUMN_ID}
      onClick={() => tableActions.toggleItem(item)}
      isChecked={tableActions.getState().isItemSelected(item)} />,
    isSortable: false
  };
}
