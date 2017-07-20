import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import { KuiButtonIcon } from './button_icon/button_icon';

const BUTTON_TYPES = [
  'basic',
  'hollow',
  'danger',
  'warning',
  'primary',
];

const ICON_POSITIONS = [
  'left',
  'right',
];

const DEFAULT_ICON_POSITION = 'left';

const buttonTypeToClassNameMap = {
  basic: 'kuiButton--basic',
  hollow: 'kuiButton--hollow',
  danger: 'kuiButton--danger',
  warning: 'kuiButton--warning',
  primary: 'kuiButton--primary',
};

const getClassName = ({ className, buttonType, hasIcon = false }) =>
  classNames('kuiButton', className, buttonTypeToClassNameMap[buttonType], {
    'kuiButton--iconText': hasIcon,
  });

const ContentWithIcon = ({ children, icon, iconPosition, isLoading }) => {
  const iconOrLoading = isLoading
    ? <KuiButtonIcon type="loading" />
    : icon;

  // We need to wrap the children so that the icon's :first-child etc. pseudo-selectors get applied
  // correctly.
  const wrappedChildren = children ? <span>{children}</span> : undefined;

  switch(iconPosition) {
    case 'left':
      return (
        <span className="kuiButton__inner">
          {iconOrLoading}
          {wrappedChildren}
        </span>
      );

    case 'right':
      return (
        <span className="kuiButton__inner">
          {wrappedChildren}
          {iconOrLoading}
        </span>
      );
  }
};

const KuiButton = ({
  isLoading,
  iconPosition = DEFAULT_ICON_POSITION,
  className,
  buttonType,
  icon,
  children,
  ...rest
}) => {
  return (
    <button
      className={getClassName({
        className,
        buttonType,
        hasIcon: icon || isLoading,
      })}
      {...rest}
    >
      <ContentWithIcon
        icon={icon}
        iconPosition={iconPosition}
        isLoading={isLoading}
      >
        {children}
      </ContentWithIcon>
    </button>
  );
};

KuiButton.propTypes = {
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(ICON_POSITIONS),
  children: PropTypes.node,
  isLoading: PropTypes.bool,
  buttonType: PropTypes.oneOf(BUTTON_TYPES),
  className: PropTypes.string,
};

const KuiLinkButton = ({
  isLoading,
  icon,
  iconPosition = DEFAULT_ICON_POSITION,
  className,
  disabled,
  buttonType,
  children,
  ...rest
}) => {
  const onClick = e => {
    if (disabled) {
      e.preventDefault();
    }
  };

  const classes = classNames(getClassName({
    className,
    buttonType,
    hasIcon: icon || isLoading,
  }), { 'kuiButton-isDisabled': disabled });

  return (
    <a
      className={classes}
      onClick={onClick}
      {...rest}
    >
      <ContentWithIcon
        icon={icon}
        iconPosition={iconPosition}
        isLoading={isLoading}
      >
        {children}
      </ContentWithIcon>
    </a>
  );
};

KuiLinkButton.propTypes = {
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(ICON_POSITIONS),
  isLoading: PropTypes.bool,
  buttonType: PropTypes.oneOf(BUTTON_TYPES),
  className: PropTypes.string,
  children: PropTypes.node,
};

const KuiSubmitButton = ({
  className,
  buttonType,
  children,
  ...rest
}) => {
  // NOTE: The `input` element is a void element and can't contain children.
  return (
    <input
      type="submit"
      value={children}
      className={getClassName({ className, buttonType })}
      {...rest}
    />
  );
};

KuiSubmitButton.propTypes = {
  children: PropTypes.string,
  buttonType: PropTypes.oneOf(BUTTON_TYPES),
  className: PropTypes.string,
};

export {
  BUTTON_TYPES,
  KuiButton,
  KuiLinkButton,
  KuiSubmitButton,
};
