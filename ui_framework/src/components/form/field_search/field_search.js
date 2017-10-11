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

export const KuiFieldSearch = ({
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
    'kuiFieldSearch',
    {
      'kuiFieldSearch--fullWidth': fullWidth,
    },
    className
  );

  return (
    <KuiFormControlLayout
      icon="search"
      fullWidth={fullWidth}
    >
      <KuiValidatableControl isInvalid={isInvalid}>
        <input
          type="search"
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

KuiFieldSearch.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  isInvalid: PropTypes.bool,
  fullWidth: PropTypes.bool,
};

KuiFieldSearch.defaultProps = {
  value: undefined,
  fullWidth: false,
};
