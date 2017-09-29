import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  ICON_TYPES,
  KuiIcon,
} from '../../icon';

const typeToClassNameMap = {
  primary: 'kuiButtonEmpty--primary',
  danger: 'kuiButtonEmpty--danger',
  disabled: 'kuiButtonEmpty--disabled',
  text: 'kuiButtonEmpty--text',
  ghost: 'kuiButtonEmpty--ghost',
};

export const TYPES = Object.keys(typeToClassNameMap);

const sizeToClassNameMap = {
  small: 'kuiButtonEmpty--small',
  large: 'kuiButtonEmpty--large',
};

export const SIZES = Object.keys(sizeToClassNameMap);

const iconSideToClassNameMap = {
  left: '',
  right: 'kuiButtonEmpty--iconRight',
};

export const ICON_SIDES = Object.keys(iconSideToClassNameMap);

const flushTypeToClassNameMap = {
  'left': 'kuiButtonEmpty--flushLeft',
  'right': 'kuiButtonEmpty--flushRight',
};

export const FLUSH_TYPES = Object.keys(flushTypeToClassNameMap);

export const KuiButtonEmpty = ({
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
    'kuiButtonEmpty',
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
        className="kuiButtonEmpty__icon"
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
      <span className="kuiButtonEmpty__content">
        {buttonIcon}
        <span>{children}</span>
      </span>
    </button>
  );
};

KuiButtonEmpty.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  iconType: PropTypes.oneOf(ICON_TYPES),
  iconSide: PropTypes.oneOf(ICON_SIDES),
  type: PropTypes.oneOf(TYPES),
  size: PropTypes.oneOf(SIZES),
  flush: PropTypes.oneOf(FLUSH_TYPES),
  isDisabled: PropTypes.bool,
};

KuiButtonEmpty.defaultProps = {
  iconSide: 'left',
  type: 'primary',
};
