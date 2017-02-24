import React from 'react';
import { CheckBoxTableCell, CheckBoxTableHeader } from 'ui_framework/components';

export const CHECKBOX_COLUMN_ID = 'checkBoxColumn';

export function getCheckBoxColumn(allItemsAreSelected, selectedIds, onToggleItem, onToggleAll) {
  return {
    id: 'checkBoxColumn',
    getHeaderCell: () => {
      return <CheckBoxTableHeader
        key={CHECKBOX_COLUMN_ID}
        onClick={onToggleAll}
        isChecked={allItemsAreSelected} />;
    },
    getRowCell: (item) => {
      function toggle() { onToggleItem(item); }
      return <CheckBoxTableCell
        key={item.id + CHECKBOX_COLUMN_ID}
        onClick={toggle}
        isChecked={selectedIds.isItemSelected(item)}/>;
    },
    isSortable: false
  };
}
