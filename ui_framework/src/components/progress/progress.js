import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const sizeToClassNameMap = {
  xs: 'kuiProgress--xs',
  s: 'kuiProgress--s',
  m: 'kuiProgress--m',
  l: 'kuiProgress--l',
};

export const SIZES = Object.keys(sizeToClassNameMap);

const colorToClassNameMap = {
  primary: 'kuiProgress--primary',
  secondary: 'kuiProgress--secondary',
  danger: 'kuiProgress--danger',
  subdued: 'kuiProgress--subdued',
  accent: 'kuiProgress--accent',
};

export const COLORS = Object.keys(colorToClassNameMap);

const positionsToClassNameMap = {
  fixed: 'kuiProgress--fixed',
  absolute: 'kuiProgress--absolute',
  static: '',
};

export const POSITIONS = Object.keys(positionsToClassNameMap);

export const KuiProgress = ({
  className,
  color,
  value,
  max,
  size,
  position,
  ...rest,
}) => {
  const classes = classNames(
    'kuiProgress',
    {
      'kuiProgress--indeterminate': max === null,
    },
    sizeToClassNameMap[size],
    colorToClassNameMap[color],
    positionsToClassNameMap[position],
    className
  );

  // Because of a FireFox issue with animation, indeterminate progress needs to use a div.
  // See https://css-tricks.com/html5-progress-element/.
  let progressType = null;
  if (max) {
    progressType = (
      <progress
        value={value}
        max={max}
        className={classes}
        {...rest}
      />
    );
  } else {
    progressType = (
      <div
        className={classes}
        {...rest}
      />
    );
  }

  return (
    <div>{progressType}</div>
  );
};

KuiProgress.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  size: PropTypes.oneOf(SIZES),
  color: PropTypes.oneOf(COLORS),
  position: PropTypes.oneOf(POSITIONS),
  max: PropTypes.number,
  indeterminate: PropTypes.bool,
};

KuiProgress.defaultProps = {
  max: null,
  size: 'm',
  color: 'secondary',
  position: 'static',
};
