import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import {
  KuiFormControlLayout,
} from '../form_control_layout';

import {
  KuiValidatableControl,
} from '../validatable_control';

export const KuiFieldPassword = ({
  className,
  id,
  name,
  placeholder,
  value,
  isInvalid,
  fullWidth,
  ...rest,
}) => {
  const classes = classNames(
    'kuiFieldPassword',
    {
      'kuiFieldPassword--fullWidth': fullWidth,
    },
    className
  );

  return (
    <KuiFormControlLayout
      icon="lock"
      fullWidth={fullWidth}
    >
      <KuiValidatableControl isInvalid={isInvalid}>
        <input
          type="password"
          id={id}
          name={name}
          placeholder={placeholder}
          className={classes}
          value={value}
          {...rest}
        />
      </KuiValidatableControl>
    </KuiFormControlLayout>
  );
};

KuiFieldPassword.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  isInvalid: PropTypes.bool,
  fullWidth: PropTypes.bool,
};

KuiFieldPassword.defaultProps = {
  value: undefined,
  fullWidth: false,
};
