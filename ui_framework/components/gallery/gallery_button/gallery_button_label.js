import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiGalleryButtonLabel = ({ children, className, ...rest }) => {
  const classes = classNames('kuiGalleryButton__label', className);
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
KuiGalleryButtonLabel.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
