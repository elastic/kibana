import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  ICON_TYPES,
  KuiIcon,
} from '../../icon';

const typeToClassNameMap = {
  primary: 'kuiButtonOption--primary',
  danger: 'kuiButtonOption--danger',
  disabled: 'kuiButtonOption--disabled',
};

export const TYPES = Object.keys(typeToClassNameMap);

const sizeToClassNameMap = {
  small: 'kuiButtonOption--small',
  large: 'kuiButtonOption--large',
};

export const SIZES = Object.keys(sizeToClassNameMap);

const iconSideToClassNameMap = {
  left: '',
  right: 'kuiButtonOption--iconRight',
};

export const ICON_SIDES = Object.keys(iconSideToClassNameMap);

const flushTypeToClassNameMap = {
  'left': 'kuiButtonOption--flushLeft',
  'right': 'kuiButtonOption--flushRight',
};

export const FLUSH_TYPES = Object.keys(flushTypeToClassNameMap);

export const KuiButtonOption = ({
  children,
  className,
  iconType,
  iconSide,
  type,
  size,
  flush,
  isDisabled,
  ...rest,
}) => {

  const classes = classNames(
    'kuiButtonOption',
    typeToClassNameMap[type],
    sizeToClassNameMap[size],
    iconSideToClassNameMap[iconSide],
    flushTypeToClassNameMap[flush],
    className,
  );

  // Add an icon to the button if one exists.
  let buttonIcon;

  if (iconType) {
    buttonIcon = (
      <KuiIcon
        className="kuiButtonOption__icon"
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
      <span className="kuiButtonOption__content">
        {buttonIcon}
        <span>{children}</span>
      </span>
    </button>
  );
};

KuiButtonOption.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  iconType: PropTypes.oneOf(ICON_TYPES),
  iconSide: PropTypes.oneOf(ICON_SIDES),
  type: PropTypes.oneOf(TYPES),
  size: PropTypes.oneOf(SIZES),
  flush: PropTypes.oneOf(FLUSH_TYPES),
  isDisabled: PropTypes.bool,
};

KuiButtonOption.defaultProps = {
  iconSide: 'left',
  type: 'primary',
};
