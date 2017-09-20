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
  ...rest,
}) => {
  const classes = classNames('kuiFieldSearch', className);

  return (
    <KuiFormControlLayout
      icon="search"
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
};

KuiFieldSearch.defaultProps = {
  value: undefined,
};
