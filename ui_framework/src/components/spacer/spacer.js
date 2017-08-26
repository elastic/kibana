import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const sizeToClassNameMap = {
  xs: 'kuiSpacer--xs',
  s: 'kuiSpacer--s',
  m: 'kuiSpacer--m',
  l: 'kuiSpacer--l',
  xl: 'kuiSpacer--xl',
  xxl: 'kuiSpacer--xxl',
};

export const SIZES = Object.keys(sizeToClassNameMap);

export const KuiSpacer = ({
  className,
  size,
  ...rest,
}) => {
  const classes = classNames(
    'kuiSpacer',
    sizeToClassNameMap[size],
    className
  );

  return (
    <div
      className={classes}
      {...rest}
    />
  );
};

KuiSpacer.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
