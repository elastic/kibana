import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiSideNavItem = ({ children, className, ...rest }) => {
  const classes = classNames('kuiSideNavItem', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiSideNavItem.propTypes = {
};
