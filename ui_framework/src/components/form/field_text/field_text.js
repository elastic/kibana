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

export const KuiFieldText = ({
  id,
  name,
  placeholder,
  value,
  className,
  icon,
  isInvalid,
  inputRef,
  ...rest,
}) => {
  const classes = classNames('kuiFieldText', className, {
    'kuiFieldText--withIcon': icon,
  });

  return (
    <KuiFormControlLayout
      icon={icon}
    >
      <KuiValidatableControl
        isInvalid={isInvalid}
      >
        <input
          type="text"
          id={id}
          name={name}
          placeholder={placeholder}
          className={classes}
          value={value}
          ref={inputRef}
          {...rest}
        />
      </KuiValidatableControl>
    </KuiFormControlLayout>
  );
};

KuiFieldText.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
  icon: PropTypes.string,
  isInvalid: PropTypes.bool,
  inputRef: PropTypes.func,
};

KuiFieldText.defaultProps = {
  value: undefined,
};
