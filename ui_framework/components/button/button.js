import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';
import keyMirror from 'keymirror';

import { KuiButtonIcon } from './button_icon';

const KuiButton = props => {
  const icon =
    props.isLoading
    ? <KuiButtonIcon type={KuiButtonIcon.TYPE.LOADING} />
    : props.icon;

  const typeToClassNameMap = {
    [KuiButton.TYPE.BASIC]: 'kuiButton--basic',
    [KuiButton.TYPE.HOLLOW]: 'kuiButton--hollow',
    [KuiButton.TYPE.DANGER]: 'kuiButton--danger',
    [KuiButton.TYPE.PRIMARY]: 'kuiButton--primary',
  };

  const className = classNames('kuiButton', props.className, {
    [typeToClassNameMap[KuiButton.TYPE[props.type]]]: props.type,
    'kuiButton--iconText': icon,
  });

  let wrappedChildren;

  if (props.children) {
    // We need to wrap the text so that the icon's :first-child etc. seudo-selectors get applied
    // correctly.
    wrappedChildren = (
      <span>{props.children}</span>
    );
  }

  // onClick is optional, so don't even call it if it's not passed in, or if we're disabled.
  const onClick =
    props.onClick && !props.isDisabled
    ? () => props.onClick(props.data)
    : () => {};

  const baseProps = {
    'data-test-subj': props.testSubject,
    className,
    disabled: props.isDisabled,
    onClick,
  };

  if (props.isSubmit) {
    // input is a void element tag and can't have children.
    if ((props.children && typeof props.children !== 'string') || props.icon) {
      throw new Error(
        `KuiButton with isSubmit prop set to true can only accept string children, and can't
        display icons. This is because input is a void element and can't contain children.`
      );
    }

    return (
      <input
        type="submit"
        value={props.children}
        {...baseProps}
      />
    );
  }

  const children =
    props.isIconOnRight
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

  if (props.href) {
    return (
      <a
        href={props.href}
        target={props.target}
        {...baseProps}
      >
        {children}
      </a>
    );
  }

  return (
    <button {...baseProps}>
      {children}
    </button>
  );
};

KuiButton.TYPE = keyMirror({
  BASIC: null,
  HOLLOW: null,
  DANGER: null,
  PRIMARY: null,
});

KuiButton.propTypes = {
  type: PropTypes.string,
  testSubject: PropTypes.string,
  icon: PropTypes.node,
  isIconOnRight: PropTypes.bool,
  children: PropTypes.node,
  isSubmit: PropTypes.bool,
  href: PropTypes.string,
  target: PropTypes.string,
  onClick: PropTypes.func,
  data: PropTypes.any,
  isDisabled: PropTypes.bool,
  isLoading: PropTypes.bool,
  className: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.array,
    PropTypes.object,
  ]),
};

// function createButtonVariation(hardCodedProps) {
//   const ButtonVariation = props => {
//     return React.createElement(KuiButton, Object.assign({}, props, hardCodedProps));
//   };

//   ButtonVariation.propTypes = Object.assign({}, KuiButton.propTypes);

//   return ButtonVariation;
// }

// const KuiBasicButton = createButtonVariation({
//   className: 'kuiButton--basic',
// });

// const KuiHollowButton = createButtonVariation({
//   className: 'kuiButton--hollow',
// });

// const KuiDangerButton = createButtonVariation({
//   className: 'kuiButton--danger',
// });

// const KuiPrimaryButton = createButtonVariation({
//   className: 'kuiButton--primary',
// });

export {
  KuiButton,
  // KuiBasicButton,
  // KuiHollowButton,
  // KuiDangerButton,
  // KuiPrimaryButton,
};
