import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiGalleryItemLabel = ({ children, className, ...rest }) => {
  const classes = classNames('kuiGalleryItem__label', className);
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
KuiGalleryItemLabel.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
