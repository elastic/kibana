import React from 'react';
import classNames from 'classnames';

export const KuiPageSidebar = ({ children, className, ...rest }) => {
  const classes = classNames('kuiPageSidebar', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
