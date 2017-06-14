import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTableRowCell = ({ children, className, ...rest }) => {
  const classes = classNames('kuiTableRowCell', className);
  return <td className={classes} {...rest} >{children}</td>;
};
KuiTableRowCell.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};



