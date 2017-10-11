import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { KuiIcon } from '../../../components';

const iconSideToClassNameMap = {
  left: '',
  right: 'kuiFormControlLayout__icon--right',
};

export const ICON_SIDES = Object.keys(iconSideToClassNameMap);

export const KuiFormControlLayout = ({ children, icon, fullWidth, iconSide, className }) => {

  const classes = classNames(
    'kuiFormControlLayout',
    {
      'kuiFormControlLayout--fullWidth': fullWidth,
    },
    className
  );

  if (icon) {
    const iconClasses = classNames('kuiFormControlLayout__icon', iconSideToClassNameMap[iconSide]);

    const optionalIcon = (
      <KuiIcon
        className={iconClasses}
        type={icon}
        size="medium"
      />
    );

    return (
      <div className={classes}>
        {children}
        {optionalIcon}
      </div>
    );
  }

  return children;
};

KuiFormControlLayout.propTypes = {
  children: PropTypes.node,
  icon: PropTypes.string,
  iconSide: PropTypes.oneOf(ICON_SIDES),
};

KuiFormControlLayout.defaultProps = {
  iconSide: 'left',
};
