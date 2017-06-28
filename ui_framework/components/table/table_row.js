import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTableRow = ({ children, className, ...rest }) => {
  const classes = classNames('kuiTableRow', className);
  return <tr className={classes} {...rest} >{children}</tr>;
};
KuiTableRow.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
