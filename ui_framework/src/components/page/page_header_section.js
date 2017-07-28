import React from 'react';
import classNames from 'classnames';

export const KuiPageHeaderSection = ({ children, className, ...rest }) => {
  const classes = classNames('kuiPageHeaderSection', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};
