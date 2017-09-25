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
} from '../../components';

const typeToClassNameMap = {
  info: 'kuiToast--info',
  success: 'kuiToast--success',
  warning: 'kuiToast--warning',
  danger: 'kuiToast--danger',
};

export const TYPES = Object.keys(typeToClassNameMap);

export const KuiToast = ({ title, type, iconType, onClose, children, className, ...rest }) => {
  const classes = classNames('kuiToast', typeToClassNameMap[type], className);
  const headerClasses = classNames('kuiToastHeader', {
    'kuiToastHeader--withBody': children,
  });

  let headerIcon;

  if (iconType) {
    headerIcon = (
      <KuiIcon
        className="kuiToastHeader__icon"
        type={iconType}
        size="medium"
        aria-hidden="true"
      />
    );
  }

  let closeButton;

  if (onClose) {
    closeButton = (
      <button
        className="kuiToast__closeButton"
        aria-label="Dismiss toast"
        onClick={onClose}
      >
        <KuiIcon
          type="cross"
          size="medium"
          aria-hidden="true"
        />
      </button>
    );
  }

  let optionalBody;

  if (children) {
    optionalBody = (
      <KuiText size="s">
        {children}
      </KuiText>
    );
  }

  return (
    <div
      className={classes}
      {...rest}
    >
      <div className={headerClasses}>
        {headerIcon}

        <span className="kuiToastHeader__title">
          {title}
        </span>
      </div>

      {closeButton}
      {optionalBody}
    </div>
  );
};

KuiToast.propTypes = {
  title: PropTypes.node,
  iconType: PropTypes.oneOf(ICON_TYPES),
  type: PropTypes.oneOf(TYPES),
  onClose: PropTypes.func,
};
