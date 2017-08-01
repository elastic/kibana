import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiIcon } from '../../components';

const sizeToClassNameMap = {
  medium: 'kuiLoading--medium',
  large: 'kuiLoading--large',
  xLarge: 'kuiLoading--xLarge',
};

export const SIZES = Object.keys(sizeToClassNameMap);

export const KuiLoading = ({ children, size, className, ...rest }) => {
  const classes = classNames(
    'kuiLoading',
    sizeToClassNameMap[size],
    className,
  );

  return (
    <div
      className={classes}
      {...rest}
    >
      <div className="kuiLoading__icon">
        <KuiIcon type="kibanaLogo" size={size} />
      </div>
      {children}
    </div>
  );
};

KuiLoading.propTypes = {
  size: PropTypes.oneOf(SIZES),
};
