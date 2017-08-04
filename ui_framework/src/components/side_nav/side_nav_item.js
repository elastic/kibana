import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiSideNavItem = ({ children, isSelected, className, ...rest }) => {
  const classes = classNames(
    'kuiSideNavItem',
    className,
    {
      'kuiSideNavItem-isSelected' : isSelected,
    }
  );

  return (
    <button
      className={classes}
      {...rest}
    >
      {children}
    </button>
  );
};

KuiSideNavItem.propTypes = {
  isSelected: PropTypes.bool,
};
