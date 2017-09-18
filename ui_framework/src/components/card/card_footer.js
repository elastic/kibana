import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiCardFooter = ({ children, className, ...rest }) => {
  const classes = classNames('kuiCard__footer', className);
  return <div className={classes} {...rest}>{children}</div>;
};
KuiCardFooter.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
