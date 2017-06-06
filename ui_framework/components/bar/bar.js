import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiBar = ({ children, className, ...rest }) => {
  const classes = classNames('kuiBar', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiBar.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
