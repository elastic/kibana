import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiGalleryItemImage = ({ children, className, ...rest }) => {
  const classes = classNames('kuiGalleryItem__image', className);
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
KuiGalleryItemImage.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
