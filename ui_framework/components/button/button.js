import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import { KuiButtonIcon } from './button_icon/button_icon';

const BUTTON_TYPES = [
  'basic',
  'hollow',
  'danger',
  'primary',
];
const ICON_POSITIONS = [
  'left',
  'right',
];
const defaultIconPosition = ICON_POSITIONS[0];

const buttonTypeToClassNameMap = {
  basic: 'kuiButton--basic',
  hollow: 'kuiButton--hollow',
  danger: 'kuiButton--danger',
  primary: 'kuiButton--primary',
};

const getClassName = ({ className, type, icon }) =>
  classNames('kuiButton', className, buttonTypeToClassNameMap[type], {
    'kuiButton--iconText': icon != null,
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
        <span>
          {iconOrLoading}
          {wrappedChildren}
        </span>
      );

    case 'right':
      return (
        <span>
          {wrappedChildren}
          {iconOrLoading}
        </span>
      );
  }
};

const KuiButton = ({
  isLoading,
  iconPosition = defaultIconPosition,
  className,
  type,
  icon,
  children,
  ...rest
}) => {
  return (
    <button
      className={getClassName({ className, type, icon })}
      { ...rest }
    >
      <ContentWithIcon
        icon={icon}
        iconPosition={iconPosition}
        isLoading={ isLoading }
      >
        { children }
      </ContentWithIcon>
    </button>
  );
};

KuiButton.propTypes = {
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(ICON_POSITIONS),
  children: PropTypes.node,
  isLoading: PropTypes.bool,
  type: PropTypes.oneOf(BUTTON_TYPES),
  className: PropTypes.string,
};

const KuiLinkButton = ({
  isLoading,
  icon,
  iconPosition = defaultIconPosition,
  className,
  type,
  children,
  ...rest
}) => {
  return (
    <a
      className={getClassName({ className, type, icon })}
      {...rest}
    >
      <ContentWithIcon
        icon={icon}
        iconPosition={iconPosition}
        isLoading={ isLoading }
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
  type: PropTypes.oneOf(BUTTON_TYPES),
  className: PropTypes.string,
  children: PropTypes.node,
};

const KuiSubmitButton = ({
  className,
  type,
  children,
  ...rest
}) => {
  return (
    <input
      type="submit"
      value={children}
      className={getClassName({ className, type })}
      { ...rest }
    />
  );
};

KuiSubmitButton.propTypes = {
  children: PropTypes.string,
  type: PropTypes.oneOf(BUTTON_TYPES),
  className: PropTypes.string,
};

export {
  BUTTON_TYPES,
  KuiButton,
  KuiLinkButton,
  KuiSubmitButton,
};
