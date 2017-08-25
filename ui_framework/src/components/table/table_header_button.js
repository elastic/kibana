import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  ICON_TYPES,
  KuiIcon,
} from '../../components/icon';

export const KuiTableHeaderButton = ({
  children,
  className,
  iconType,
  ...rest,
}) => {
  const classes = classNames('kuiTableHeaderButton', className);

  // Add an icon to the button if one exists.
  let buttonIcon;

  if (iconType) {
    buttonIcon = (
      <KuiIcon
        className="kuiTableHeaderButton__icon"
        type={iconType}
        size="medium"
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      className={classes}
      {...rest}
    >
      <span>{children}</span>
      {buttonIcon}
    </button>
  );
};

KuiTableHeaderButton.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  iconType: PropTypes.oneOf(ICON_TYPES),
};
