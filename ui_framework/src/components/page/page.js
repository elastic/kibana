import React from 'react';
import classNames from 'classnames';

export const KuiPage = ({ children, className, ...rest }) => {
  const classes = classNames('kuiPage', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
