import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const sizeToClassNameMap = {
  full: 'kuiHorizontalRule--full',
  half: 'kuiHorizontalRule--half',
  quarter: 'kuiHorizontalRule--quarter',
};

export const SIZES = Object.keys(sizeToClassNameMap);

const marginToClassNameMap = {
  small: 'kuiHorizontalRule--marginSmall',
  medium: 'kuiHorizontalRule--marginMedium',
  large: 'kuiHorizontalRule--marginLarge',
  XLarge: 'kuiHorizontalRule--marginXLarge',
  XXLarge: 'kuiHorizontalRule--marginXXLarge',
};

export const MARGINS = Object.keys(marginToClassNameMap);

export const KuiHorizontalRule = ({
  className,
  size,
  margin,
  ...rest,
}) => {
  const classes = classNames(
    'kuiHorizontalRule',
    sizeToClassNameMap[size],
    marginToClassNameMap[margin],
    className
  );

  return (
    <hr
      className={classes}
      {...rest}
    />
  );
};

KuiHorizontalRule.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  size: PropTypes.oneOf(SIZES),
  margin: PropTypes.oneOf(MARGINS),
};

KuiHorizontalRule.defaultProps = {
  size: 'full',
  margin: 'large',
};
