import React from 'react';

import { KuiCheckBox } from '../form';
import { KuiTd } from './kui_table';
import { KuiTableCellLiner } from './kui_table_cell_liner';

export function CheckBoxTableCell({ onClick, isChecked }) {
  return <KuiTableCellLiner className="kuiTableRowCell--checkBox">
      <KuiCheckBox onChange={onClick} isChecked={isChecked} />
    </KuiTableCellLiner>;
}

CheckBoxTableCell.propTypes = {
  onClick: React.PropTypes.func.isRequired,
  isChecked: React.PropTypes.bool.isRequired
};
