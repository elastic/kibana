import React from 'react';
import classNames from 'classnames';

export const KuiPageHeader = ({ children, className, ...rest }) => {
  const classes = classNames('kuiPageHeader', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
