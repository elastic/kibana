import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import {
  KuiFormControlLayout,
} from '../form_control_layout';

export const KuiFieldPassword = ({ className, id, name, placeholder, value, ...rest }) => {
  const classes = classNames('kuiFieldPassword', className);

  return (
    <KuiFormControlLayout
      icon="lock"
    >
      <input
        type="password"
        id={id}
        name={name}
        placeholder={placeholder}
        className={classes}
        value={value}
        {...rest}
      />
    </KuiFormControlLayout>
  );
};

KuiFieldPassword.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

KuiFieldPassword.defaultProps = {
  value: undefined,
};
