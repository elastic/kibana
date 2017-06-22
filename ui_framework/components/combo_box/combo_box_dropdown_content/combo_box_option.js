import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import {
  KuiKeyboardAccessible,
} from '../../index';

export const KuiComboBoxOption = ({
  children,
  className,
  onClick,
  isDisabled,
   ...rest,
}) => {
  const classes = classNames('kuiComboBoxOption', className, {
    'kuiComboBoxOption-isDisabled': isDisabled,
  });

  const option = (
    <div
      className={classes}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );

  if (!onClick) {
    return option;
  }

  // KuiKeyboardAccessible complains if there's no onClick assigned.
  return (
    <KuiKeyboardAccessible>
      {option}
    </KuiKeyboardAccessible>
  );
};

KuiComboBoxOption.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  onClick: PropTypes.func,
  isDisabled: PropTypes.bool,
};
