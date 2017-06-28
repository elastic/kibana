import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { KuiTableRowCell } from './table_row_cell';
import { KuiTableRowCellLiner } from './table_row_cell_liner';

export const KuiTableRowCheckBoxCell = ({ onChange, isChecked, className, ...rest }) => {
  const classes = classNames('kuiTableRowCell--checkBox', className);
  return <KuiTableRowCell className={ classes } {...rest} >
    <KuiTableRowCellLiner>
      <input type="checkbox" className="kuiCheckBox" onChange={ onChange } checked={ isChecked } />
    </KuiTableRowCellLiner>
  </KuiTableRowCell>;
};
KuiTableRowCheckBoxCell.propTypes = {
  isChecked: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
};
