import React from 'react';

import { KuiCheckBox } from '../form';
import { KuiTh } from './kui_table';

export function CheckBoxTableHeader({ onClick, isChecked }) {
  return <KuiTh className="kuiTableHeaderCell--checkBox">
    <KuiCheckBox onChange={onClick} isChecked={isChecked} />
  </KuiTh>;
}

CheckBoxTableHeader.propTypes = {
  onClick: React.PropTypes.func.isRequired,
  isChecked: React.PropTypes.bool.isRequired
};
