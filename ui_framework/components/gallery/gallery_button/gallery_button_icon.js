import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiGalleryButtonIcon = ({ children, className, ...rest }) => {
  const classes = classNames('kuiGalleryButton__icon','kuiIcon', className);
  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
KuiGalleryButtonIcon.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
