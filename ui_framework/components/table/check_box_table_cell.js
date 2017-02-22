import React from 'react';

import { KuiCheckBox } from '../form';
import { KuiTd } from './kui_table';
import { KuiTableCellLiner } from './kui_table_cell_liner';

export function CheckBoxTableCell({ onClick, isChecked }) {
  return <KuiTd className="kuiTableRowCell--checkBox">
    <KuiTableCellLiner>
      <KuiCheckBox onChange={onClick} isChecked={isChecked} />
    </KuiTableCellLiner>
  </KuiTd>;
}

CheckBoxTableCell.propTypes = {
  onClick: React.PropTypes.func.isRequired,
  isChecked: React.PropTypes.bool.isRequired
};
