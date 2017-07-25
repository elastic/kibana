import React from 'react';
import classNames from 'classnames';

export const KuiKeyPadMenu = ({ children, className, ...rest }) => {
  const classes = classNames('kuiKeyPadMenu', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
