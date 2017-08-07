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
  disabled: 'kuiButton--disabled',
};

export const TYPES = Object.keys(typeToClassNameMap);

const sizeToClassNameMap = {
  small: 'kuiButton--small',
  large: 'kuiButton--large',
};

export const SIZES = Object.keys(sizeToClassNameMap);

export const KuiButton = props => {
  const {
    children,
    className,
    iconType,
    iconReverse,
    type,
    size,
    fill,
    ...rest,
  } = props;

  const classes = classNames(
    'kuiButton',
    typeToClassNameMap[type],
    sizeToClassNameMap[size],
    className,
    {
      'kuiButton--fill': fill,
      'kuiButton--reverse': iconReverse,
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
  iconType: PropTypes.oneOf(ICON_TYPES),
  iconReverse: React.PropTypes.bool,
  fill: React.PropTypes.bool,
  type: PropTypes.oneOf(TYPES),
  size: PropTypes.oneOf(SIZES),
};

KuiButton.defaultProps = {
  iconReverse: false,
  type: 'primary',
  fill: false,
};
