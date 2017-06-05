import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiCardGroup = ({ children, className, united, ...rest }) => {
  const classes = classNames('kuiCardGroup', className, { 'kuiCardGroup--united': united });
  return <div className={classes} {...rest}>{children}</div>;
};
KuiCardGroup.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  united: PropTypes.bool
};
