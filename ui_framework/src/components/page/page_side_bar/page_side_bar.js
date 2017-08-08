import React from 'react';
import classNames from 'classnames';

export const KuiPageSideBar = ({ children, className, ...rest }) => {
  const classes = classNames('kuiPageSideBar', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
