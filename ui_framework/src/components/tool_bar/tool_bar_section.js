import React from 'react';
import classNames from 'classnames';

export const KuiToolBarSection = ({ children, className, ...rest }) => {
  const classes = classNames('kuiToolBarSection', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiToolBarSection.propTypes = {
  children: React.PropTypes.node,
  className: React.PropTypes.string,
};
