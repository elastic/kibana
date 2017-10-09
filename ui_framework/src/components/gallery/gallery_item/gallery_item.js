import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiGalleryItem = ({ children, className, ...rest }) => {
  const classes = classNames('kuiGalleryItem', className);
  return (
    <a
      className={classes}
      {...rest}
    >
      {children}
    </a>
  );
};
KuiGalleryItem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
