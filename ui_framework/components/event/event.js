import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiEvent = ({ children, className, ...rest }) => {
  const classes = classNames('kuiEvent', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiEvent.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
