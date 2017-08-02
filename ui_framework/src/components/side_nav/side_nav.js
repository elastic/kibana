import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiSideNav = ({ children, className, ...rest }) => {
  const classes = classNames('kuiSideNav', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiSideNav.propTypes = {
};
