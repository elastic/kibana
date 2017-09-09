import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  ICON_TYPES,
  KuiIcon,
} from '../../icon';

const typeToClassNameMap = {
  primary: 'kuiButtonIcon--primary',
  danger: 'kuiButtonIcon--danger',
  disabled: 'kuiButtonIcon--disabled',
  ghost: 'kuiButtonIcon--ghost',
};

export const TYPES = Object.keys(typeToClassNameMap);


export const KuiButtonIcon = ({
  className,
  iconType,
  type,
  isDisabled,
  ...rest,
}) => {

  const classes = classNames(
    'kuiButtonIcon',
    typeToClassNameMap[type],
    className,
  );

  // Add an icon to the button if one exists.
  let buttonIcon;

  if (iconType) {
    buttonIcon = (
      <KuiIcon
        className="kuiButtonIcon__icon"
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
      {buttonIcon}
    </button>
  );
};

KuiButtonIcon.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  iconType: PropTypes.oneOf(ICON_TYPES),
  type: PropTypes.oneOf(TYPES),
  isDisabled: PropTypes.bool,
};

KuiButtonIcon.defaultProps = {
  type: 'primary',
};
