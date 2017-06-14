import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiTableInfo = ({ children, className, ...rest }) => {
  const classes = classNames('kuiTableInfo', className);
  return <kuiTableInfo className={classes} {...rest} >{children}</kuiTableInfo>;
};
KuiTableInfo.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};



