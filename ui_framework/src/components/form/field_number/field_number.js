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

export const KuiFieldNumber = ({
  className,
  icon,
  id,
  placeholder,
  name,
  min,
  max,
  value,
  isInvalid,
  ...rest,
}) => {
  const classes = classNames('kuiFieldNumber', className, {
    'kuiFieldNumber--withIcon': icon,
  });

  return (
    <KuiFormControlLayout
      icon={icon}
    >
      <KuiValidatableControl isInvalid={isInvalid}>
        <input
          type="number"
          id={id}
          min={min}
          max={max}
          name={name}
          value={value}
          placeholder={placeholder}
          className={classes}
          {...rest}
        />
      </KuiValidatableControl>
    </KuiFormControlLayout>
  );
};

KuiFieldNumber.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  min: PropTypes.number,
  max: PropTypes.number,
  step: PropTypes.number,
  value: PropTypes.number,
  icon: PropTypes.string,
  isInvalid: PropTypes.bool,
};

KuiFieldNumber.defaultProps = {
  value: undefined,
};

