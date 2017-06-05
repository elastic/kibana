import React from 'react';
import classNames from 'classnames';

export const KuiBarSection = ({ children, className, ...rest }) => {
  const classes = classNames('kuiBarSection', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiBarSection.propTypes = {
  children: React.PropTypes.node,
  className: React.PropTypes.string,
};
