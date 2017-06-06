import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiCardGroup = ({ children, className, isUnited, ...rest }) => {
  const classes = classNames('kuiCardGroup', className, { 'kuiCardGroup--united': isUnited });
  return <div className={classes} {...rest}>{children}</div>;
};
KuiCardGroup.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  isUnited: PropTypes.bool
};
