import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import {
  KuiFormControlLayout,
} from '../form_control_layout';

export const KuiFieldNumber = ({
  className,
  icon,
  id,
  placeholder,
  name,
  min,
  max,
  value,
  ...rest,
}) => {
  const classes = classNames('kuiFieldNumber', className, {
    'kuiFieldNumber--withIcon': icon,
  });

  return (
    <KuiFormControlLayout
      icon={icon}
    >
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
};

KuiFieldNumber.defaultProps = {
  value: undefined,
};

