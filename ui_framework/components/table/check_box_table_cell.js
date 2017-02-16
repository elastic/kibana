import React from 'react';

import { KuiCheckBox } from '../form';
import { KuiTd } from './kui_table';

export function CheckBoxTableCell({ onClick, isChecked }) {
  return <KuiTd className="kuiTableRowCell--checkBox">
    <KuiCheckBox onClick={onClick} isChecked={isChecked} />
  </KuiTd>;
}

CheckBoxTableCell.propTypes = {
  onClick: React.PropTypes.func.isRequired,
  isChecked: React.PropTypes.bool.isRequired
};
