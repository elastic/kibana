import React from 'react';
import classNames from 'classnames';

export const KuiActionItem = ({ children, className, ...rest }) => {
  const classes = classNames('kuiActionItem', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiActionItem.propTypes = {
  children: React.PropTypes.node,
  className: React.PropTypes.string,
};
