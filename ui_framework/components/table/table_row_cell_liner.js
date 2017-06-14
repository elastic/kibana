import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTableRowCellLiner = ({ children, className, ...rest }) => {
  const classes = classNames('kuiTableRowCell__liner', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiTableRowCellLiner.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};



