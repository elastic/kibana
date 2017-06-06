import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiBarSection = ({ children, className, ...rest }) => {
  const classes = classNames('kuiBarSection', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiBarSection.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
