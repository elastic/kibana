import React from 'react';
import classNames from 'classnames';

export const KuiToolBarText = ({ children, className, ...rest }) => {
  const classes = classNames('kuiToolBarText', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiToolBarText.propTypes = {
  children: React.PropTypes.node,
  className: React.PropTypes.string,
};
