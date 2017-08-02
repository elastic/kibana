import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

const sizeToClassNameMap = {
  small: 'kuiLoadingSpinner--small',
  medium: 'kuiLoadingSpinner--medium',
  large: 'kuiLoadingSpinner--large',
  xLarge: 'kuiLoadingSpinner--xLarge',
};

export const SIZES = Object.keys(sizeToClassNameMap);

export const KuiLoadingSpinner = ({ children, size, className, ...rest }) => {
  const classes = classNames(
    'kuiLoadingSpinner',
    sizeToClassNameMap[size],
    className
  );

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiLoadingSpinner.propTypes = {
  size: PropTypes.oneOf(SIZES),
};
