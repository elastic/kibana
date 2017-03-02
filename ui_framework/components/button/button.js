import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';
import keyMirror from 'keymirror';

const KuiButton = props => {
  if (props.isSubmit) {
    // input is a void element tag and can't have children.
    if (typeof props.children !== 'string' || props.icon || props.rightIcon) {
      throw new Error(
        `KuiButton with isSubmit prop set to true can only accept string children, and can't
        display icons. This is because input is a void element and can't contain children.`
      );
    }
  }

  function onClick() {
    // onClick is optional, so exit early if it doesn't exist.
    if (!props.onClick) {
      return;
    }
    // Don't even trigger the onClick handler if we're disabled.
    if (props.isDisabled) {
      return;
    }
    props.onClick(props.data);
  }

  const classes = classNames('kuiButton', props.classes, {
    'kuiButton--iconText': props.icon || props.iconRight,
  });

  let wrappedChildren;

  if (props.children) {
    // We need to wrap the text so that the icon's :first-child etc. seudo-selectors get applied
    // correctly.
    wrappedChildren = (
      <span>{props.children}</span>
    );
  }

  const elementType = props.isSubmit ? 'input' : props.href ? 'a' : 'button';

  return React.createElement(elementType, {
    'data-test-subj': props.testSubject,
    className: classes,
    href: props.href,
    target: props.target,
    type: props.isSubmit ? 'submit' : null,
    disabled: props.isDisabled,
    onClick,
    value: props.isSubmit ? props.children : null,
    children: props.isSubmit ? null : [props.icon, wrappedChildren, props.iconRight],
  });
};

KuiButton.propTypes = {
  testSubject: PropTypes.string,
  data: PropTypes.any,
  icon: PropTypes.node,
  iconRight: PropTypes.node,
  children: PropTypes.node,
  type: PropTypes.string,
  isSubmit: PropTypes.bool,
  href: PropTypes.string,
  target: PropTypes.string,
  onClick: PropTypes.func,
  isDisabled: PropTypes.bool,
  hasIcon: PropTypes.bool,
  classes: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.array,
    PropTypes.object,
  ]),
};

export { KuiButton };
