import React from 'react';
import classNames from 'classnames';

export const KuiRadio = ({ children, className, ...rest }) => {
  const classes = classNames('kuiRadio', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
