import React from 'react';
import classNames from 'classnames';

export const KuiHeader = ({ children, className, ...rest }) => {
  const classes = classNames('kuiHeader kui--flex', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
