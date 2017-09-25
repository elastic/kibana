import React, {
  PropTypes,
} from 'react';

import classNames from 'classnames';

import {
  ICON_TYPES,
  KuiIcon,
} from '../icon';

import {
  KuiText,
} from '../../components/';

const typeToClassNameMap = {
  info: 'kuiCallOut--info',
  success: 'kuiCallOut--success',
  warning: 'kuiCallOut--warning',
  danger: 'kuiCallOut--danger',
};

export const TYPES = Object.keys(typeToClassNameMap);

export const KuiCallOut = ({ title, type, iconType, children, className, ...rest }) => {
  const classes = classNames('kuiCallOut', typeToClassNameMap[type], className);

  let headerIcon;

  if (iconType) {
    headerIcon = (
      <KuiIcon
        className="kuiCallOutHeader__icon"
        type={iconType}
        size="medium"
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={classes}
      {...rest}
    >
      <div className="kuiCallOutHeader">
        {headerIcon}

        <span className="kuiCallOutHeader__title">
          {title}
        </span>
      </div>

      <KuiText size="s">
        {children}
      </KuiText>
    </div>
  );
};

KuiCallOut.propTypes = {
  title: PropTypes.node,
  iconType: PropTypes.oneOf(ICON_TYPES),
  type: PropTypes.oneOf(TYPES),
};

KuiCallOut.defaultProps = {
  type: 'info',
};
