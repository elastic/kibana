import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const colorsToClassNameMap = {
  'default': 'kuiTextColor--default',
  'subdued': 'kuiTextColor--subdued',
  'primary': 'kuiTextColor--primary',
  'secondary': 'kuiTextColor--secondary',
  'accent': 'kuiTextColor--accent',
  'danger': 'kuiTextColor--danger',
  'warning': 'kuiTextColor--warning',
  'ghost': 'kuiTextColor--ghost',
};

export const COLORS = Object.keys(colorsToClassNameMap);

export const KuiTextColor = ({
  children,
  color,
  className,
  ...rest,
}) => {
  const classes = classNames(
    'kuiTextColor',
    colorsToClassNameMap[color],
    className
  );

  return (
    <span
      className={classes}
      {...rest}
    >
      {children}
    </span>
  );
};

KuiTextColor.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  color: PropTypes.oneOf(COLORS),
};

KuiTextColor.defaultProps = {
  color: 'default',
};
