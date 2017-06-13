import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiGalleryButtonImage = ({ children, className, ...rest }) => {
  const classes = classNames('kuiGalleryButton__image', className);
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
KuiGalleryButtonImage.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
