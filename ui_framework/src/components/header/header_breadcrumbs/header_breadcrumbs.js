import React from 'react';
import classNames from 'classnames';

export const KuiHeaderBreadcrumbs = ({ children, className, ...rest }) => {
  const classes = classNames('kui--flex', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
