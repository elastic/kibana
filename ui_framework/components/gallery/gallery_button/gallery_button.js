import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiGalleryButton = ({ children, className, ...rest }) => {
  const classes = classNames('kuiGalleryButton', className);
  return (
    <a
      className={classes}
      {...rest}
    >
      {children}
    </a>
  );
};
KuiGalleryButton.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
