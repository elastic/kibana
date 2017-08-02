import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiSideNav = ({ children, className, ...rest }) => {
  const classes = classNames('kuiSideNav', className);

  return (
    <nav
      className={classes}
      {...rest}
    >
      {children}
    </nav>
  );
};

KuiSideNav.propTypes = {
};
