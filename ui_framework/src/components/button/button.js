import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';

import {
  ICON_TYPES,
  KuiIcon,
} from '../icon';

const typeToClassNameMap = {
  primary: 'kuiButton--primary',
  secondary: 'kuiButton--secondary',
  warning: 'kuiButton--warning',
  danger: 'kuiButton--danger',
  ghost: 'kuiButton--ghost',
};

export const TYPES = Object.keys(typeToClassNameMap);

const sizeToClassNameMap = {
  small: 'kuiButton--small',
  large: 'kuiButton--large',
};

export const SIZES = Object.keys(sizeToClassNameMap);

const iconSideToClassNameMap = {
  left: '',
  right: 'kuiButton--iconRight',
};

export const ICON_SIDES = Object.keys(iconSideToClassNameMap);

export const KuiButton = ({
  children,
  className,
  iconType,
  iconSide,
  type,
  size,
  fill,
  isDisabled,
  ...rest,
}) => {

  const classes = classNames(
    'kuiButton',
    typeToClassNameMap[type],
    sizeToClassNameMap[size],
    iconSideToClassNameMap[iconSide],
    className,
    {
      'kuiButton--fill': fill,
    },
  );

  // Add an icon to the button if one exists.
  let buttonIcon;

  if (iconType) {
    buttonIcon = (
      <KuiIcon
        className="kuiButton__icon"
        type={iconType}
        size="medium"
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      disabled={isDisabled}
      className={classes}
      {...rest}
    >
      <span className="kuiButton__content">
        {buttonIcon}
        <span>{children}</span>
      </span>
    </button>
  );
};

KuiButton.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  iconType: PropTypes.oneOf(ICON_TYPES),
  iconSide: PropTypes.oneOf(ICON_SIDES),
  fill: React.PropTypes.bool,
  type: PropTypes.oneOf(TYPES),
  size: PropTypes.oneOf(SIZES),
  isDisabled: PropTypes.bool,
};

KuiButton.defaultProps = {
  iconSide: 'left',
  type: 'primary',
  fill: false,
};
