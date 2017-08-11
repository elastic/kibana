import React from 'react';
import classNames from 'classnames';

export const KuiToolBar = ({ children, className, ...rest }) => {
  const classes = classNames('kuiToolBar', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiToolBar.propTypes = {
  children: React.PropTypes.node,
  className: React.PropTypes.string,
};
