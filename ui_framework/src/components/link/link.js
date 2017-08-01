import React from 'react';
import classNames from 'classnames';

export const KuiLink = ({ children, className, ...rest }) => {
  const classes = classNames('kuiLink', className);

  return (
    <a
      className={classes}
      {...rest}
    >
      {children}
    </a>
  );
};
