import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiToolBarSection = ({ children, className, ...rest }) => {
  const classes = classNames('kuiToolBarSection', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiToolBarSection.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
