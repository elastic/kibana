import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';
import keyMirror from 'keymirror';

import { KuiButtonIcon } from './button_icon/button_icon';

const commonPropTypes = {
  type: PropTypes.oneOf([
    'basic',
    'hollow',
    'danger',
    'primary',
  ]),
  testSubject: PropTypes.string,
  isDisabled: PropTypes.bool,
  onClick: PropTypes.func,
  data: PropTypes.any,
  className: PropTypes.string,
};

// KuiSubmitButton is an `input` element, which is a void element and can't contain children. But
// the regular KuiButton and KuiLink button are non-void elements, so they can contain children.
// These propTypes will only apply to these components.
const nonVoidPropTypes = {
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf([
    'left',
    'right',
  ]),
  children: PropTypes.node,
  isLoading: PropTypes.bool,
};

const nonVoidDefaultProps = {
  iconPosition: 'left',
};

const getIcon = props => (
  props.isLoading
    ? <KuiButtonIcon type="loading" />
    : props.icon
);

const getClassName = (props, icon) => {
  const typeToClassNameMap = {
    basic: 'kuiButton--basic',
    hollow: 'kuiButton--hollow',
    danger: 'kuiButton--danger',
    primary: 'kuiButton--primary',
  };

  return classNames('kuiButton', props.className, {
    [typeToClassNameMap[props.type]]: props.type,
    'kuiButton--iconText': icon,
  });
};

const getChildren = (props, icon) => {
  // We need to wrap the text so that the icon's :first-child etc. seudo-selectors get applied
  // correctly.
  const wrappedChildren = props.children ? <span>{props.children}</span> : undefined;

  switch(props.iconPosition) {
    case 'left':
      return (
        <span>
          {icon}
          {wrappedChildren}
        </span>
      );

    case 'right':
      return (
        <span>
          {wrappedChildren}
          {icon}
        </span>
      );
  }
};

const getOnClick = props => (
  // onClick is optional, so don't even call it if it's not passed in, or if we're disabled.
  props.onClick && !props.isDisabled
    ? () => props.onClick(props.data)
    : () => {}
);

const getCommonProps = (props, icon) => ({
  'data-test-subj': props.testSubject,
  className: getClassName(props, icon),
  onClick: getOnClick(props),
  disabled: props.isDisabled,
});

const KuiButton = props => {
  const icon = getIcon(props);
  const children = getChildren(props, icon);
  const commonProps = getCommonProps(props, icon);

  return (
    <button {...commonProps}>
      {children}
    </button>
  );
};

KuiButton.propTypes = {
  ...nonVoidPropTypes,
  ...commonPropTypes,
};

KuiButton.defaultProps = {
  ...nonVoidDefaultProps,
};

const KuiLinkButton = props => {
  const icon = getIcon(props);
  const children = getChildren(props, icon);
  const commonProps = getCommonProps(props, icon);

  return (
    <a
      href={props.href}
      target={props.target}
      {...commonProps}
    >
      {children}
    </a>
  );
};

KuiLinkButton.propTypes = {
  href: PropTypes.string,
  target: PropTypes.string,
  ...nonVoidPropTypes,
  ...commonPropTypes,
};

KuiLinkButton.defaultProps = {
  ...nonVoidDefaultProps,
};

const KuiSubmitButton = props => {
  const commonProps = getCommonProps(props);

  return (
    <input
      type="submit"
      value={props.children}
      {...commonProps}
    />
  );
};

KuiSubmitButton.propTypes = {
  children: PropTypes.string,
  ...commonPropTypes,
};

export {
  KuiButton,
  KuiLinkButton,
  KuiSubmitButton,
};
