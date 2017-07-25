import React from 'react';
import classNames from 'classnames';

export const KuiHeaderBreadcrumbCollapsed = ({ className, ...rest }) => {
  const classes = classNames('kuiHeaderBreadcrumb kuiHeaderBreadcrumb--collapsed', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      &#8230;
    </div>
  );
};
