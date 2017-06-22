import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

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

  return (
    <button
      className={classes}
      onMouseDown={onClick}
      {...rest}
    >
      {children}
    </button>
  );
};

KuiComboBoxOption.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  onClick: PropTypes.func,
  isDisabled: PropTypes.bool,
};
