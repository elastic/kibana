import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';
import keyMirror from 'keymirror';

import { KuiButtonIcon } from './button_icon/button_icon';

const commonPropTypes = {
  type: PropTypes.string,
  testSubject: PropTypes.string,
  isDisabled: PropTypes.bool,
  onClick: PropTypes.func,
  data: PropTypes.any,
  className: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.array,
    PropTypes.object,
  ]),
};

const getIcon = props => (
  props.isLoading
    ? <KuiButtonIcon type={KuiButtonIcon.TYPE.LOADING} />
    : props.icon
);

const getClassName = (props, icon) => {
  const typeToClassNameMap = {
    [KuiButton.TYPE.BASIC]: 'kuiButton--basic',
    [KuiButton.TYPE.HOLLOW]: 'kuiButton--hollow',
    [KuiButton.TYPE.DANGER]: 'kuiButton--danger',
    [KuiButton.TYPE.PRIMARY]: 'kuiButton--primary',
  };

  return classNames('kuiButton', props.className, {
    [typeToClassNameMap[KuiButton.TYPE[props.type]]]: props.type,
    'kuiButton--iconText': icon,
  });
};

const getChildren = (props, icon) => {
  // We need to wrap the text so that the icon's :first-child etc. seudo-selectors get applied
  // correctly.
  const wrappedChildren = props.children ? <span>{props.children}</span> : undefined;

  return props.isIconOnRight
    ? (
      <span>
        {wrappedChildren}
        {icon}
      </span>
    ) : (
      <span>
        {icon}
        {wrappedChildren}
      </span>
    );
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

KuiButton.propTypes = Object.assign({}, commonPropTypes, {
  icon: PropTypes.node,
  isIconOnRight: PropTypes.bool,
  children: PropTypes.node,
  isLoading: PropTypes.bool,
});

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

KuiLinkButton.propTypes = Object.assign({}, commonPropTypes, {
  href: PropTypes.string,
  target: PropTypes.string,
  icon: PropTypes.node,
  isIconOnRight: PropTypes.bool,
  children: PropTypes.node,
  isLoading: PropTypes.bool,
});

const KuiSubmitButton = props => {
  const icon = getIcon(props);
  const commonProps = getCommonProps(props, icon);

  return (
    <input
      type="submit"
      value={props.children}
      {...commonProps}
    />
  );
};

KuiSubmitButton.propTypes = Object.assign({}, commonPropTypes, {
  children: PropTypes.string,
});

KuiButton.TYPE = KuiSubmitButton.TYPE = KuiLinkButton.TYPE = keyMirror({
  BASIC: null,
  HOLLOW: null,
  DANGER: null,
  PRIMARY: null,
});

export {
  KuiButton,
  KuiLinkButton,
  KuiSubmitButton,
};
