import React from 'react';
import classNames from 'classnames';

export const KuiToolBarFooterSection = ({ children, className, ...rest }) => {
  const classes = classNames('kuiToolBarFooterSection', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiToolBarFooterSection.propTypes = {
  children: React.PropTypes.node,
  className: React.PropTypes.string,
};
