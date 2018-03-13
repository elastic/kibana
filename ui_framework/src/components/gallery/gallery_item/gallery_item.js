import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const checkHrefAndOnClick = (props, propName, componentName) => {
  if (props.href && props.onClick) {
    throw new Error(
      `${componentName} must either specify an href property (if it should be a link) ` +
      `or an onClick property (if it should be a button), but not both.`
    );
  }
};

export const KuiGalleryItem = ({ children, className, href, ...rest }) => {
  const classes = classNames('kuiGalleryItem', className);
  if (href) {
    return (
      <a
        className={classes}
        href={href}
        {...rest}
      >
        {children}
      </a>
    );
  } else {
    return (
      <button
        className={classes}
        {...rest}
      >
        {children}
      </button>
    );
  }
};
KuiGalleryItem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  href: checkHrefAndOnClick,
  onClick: PropTypes.func,
};
