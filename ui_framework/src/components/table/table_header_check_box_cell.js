import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { KuiTableHeaderCell } from './table_header_cell';

export const KuiTableHeaderCheckBoxCell = ({ onChange, isChecked, className, ...rest }) => {
  const classes = classNames('kuiTableHeaderCell--checkBox', className);
  return (
    <KuiTableHeaderCell
      className={classes}
      {...rest}
    >
      <input
        type="checkbox"
        className="kuiCheckBox"
        onChange={onChange}
        checked={isChecked}
        aria-label={`${isChecked ? 'Deselect' : 'Select'} all rows`}
      />
    </KuiTableHeaderCell>
  );
};
KuiTableHeaderCheckBoxCell.propTypes = {
  isChecked: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
};
