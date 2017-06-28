import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTableHeaderCell = ({ children, className, ...rest }) => {
  const classes = classNames('kuiTableHeaderCell', className);
  return <th className={classes} {...rest} >{children}</th>;
};
KuiTableHeaderCell.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
