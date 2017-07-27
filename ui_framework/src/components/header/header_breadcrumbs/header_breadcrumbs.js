import React from 'react';
import classNames from 'classnames';

export const KuiHeaderBreadcrumbs = ({ children, className, ...rest }) => {
  const classes = classNames('kuiHeaderBreadcrumbs', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
