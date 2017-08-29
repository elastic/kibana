import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiCard = ({ children, className, ...rest }) => {
  const classes = classNames('kuiCard', className);
  return <div className={classes} {...rest}>{children}</div>;
};
KuiCard.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
