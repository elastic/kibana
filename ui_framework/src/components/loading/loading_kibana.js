import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiIcon } from '../../components';

const sizeToClassNameMap = {
  medium: 'kuiLoadingKibana--medium',
  large: 'kuiLoadingKibana--large',
  xLarge: 'kuiLoadingKibana--xLarge',
};

export const SIZES = Object.keys(sizeToClassNameMap);

export const KuiLoadingKibana = ({ children, size, className, ...rest }) => {
  const classes = classNames(
    'kuiLoadingKibana',
    sizeToClassNameMap[size],
    className,
  );

  return (
    <div
      className={classes}
      {...rest}
    >
      <div className="kuiLoadingKibana__icon">
        <KuiIcon type="logoKibana" size={size} />
      </div>
      {children}
    </div>
  );
};

KuiLoadingKibana.propTypes = {
  size: PropTypes.oneOf(SIZES),
};
