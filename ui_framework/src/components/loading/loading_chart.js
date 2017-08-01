import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

const sizeToClassNameMap = {
  medium: 'kuiLoadingChart--medium',
  large: 'kuiLoadingChart--large',
  xLarge: 'kuiLoadingChart--xLarge',
};

export const SIZES = Object.keys(sizeToClassNameMap);

export const KuiLoadingChart = ({ size, mono, className, ...rest }) => {
  const classes = classNames(
    'kuiLoadingChart',
    mono === true ? 'kuiLoadingChart--mono' : '',
    className,
    sizeToClassNameMap[size],
  );

  return (
    <div
      className={classes}
      {...rest}
    >
      <div />
      <div />
      <div />
      <div />
    </div>
  );
};

KuiLoadingChart.propTypes = {
  size: PropTypes.oneOf(SIZES),
};

