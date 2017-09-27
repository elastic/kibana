import React from 'react';
import classNames from 'classnames';

const colorsToClassNameMap = {
  'primary': 'kuiLink--primary',
  'subdued': 'kuiLink--subdued',
  'secondary': 'kuiLink--secondary',
  'accent': 'kuiLink--accent',
  'danger': 'kuiLink--danger',
  'warning': 'kuiLink--warning',
  'ghost': 'kuiLink--ghost',
};

export const COLORS = Object.keys(colorsToClassNameMap);

export const KuiLink = ({ children, color, className, onClick, ...rest }) => {
  const classes = classNames('kuiLink', colorsToClassNameMap[color], className);

  let link;
  if (onClick) {
    link = (
      <button
        className={classes}
        onClick={onClick}
        {...rest}
      >
        {children}
      </button>
    );

  } else {
    link = (
      <a
        className={classes}
        {...rest}
      >
        {children}
      </a>
    );
  }
  return (
    link
  );
};

KuiLink.defaultProps = {
  color: 'primary',
};
