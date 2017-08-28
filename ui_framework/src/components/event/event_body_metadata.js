import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiEventBodyMetadata = ({ children, className, ...rest }) => {
  const classes = classNames('kuiEventBody__metadata', className);
  return <div className={classes} {...rest} >{children}</div>;
};
KuiEventBodyMetadata.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
