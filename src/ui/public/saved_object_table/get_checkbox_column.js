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
      return <CheckBoxTableCell
        key={item.id + CHECKBOX_COLUMN_ID}
        onClick={onToggleItem.bind(null, item)}
        isChecked={selectedIds.filter(id => id === item.id).length > 0}/>;
    },
    isSortable: false
  };
}
