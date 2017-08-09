import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiFormRow } from '../form_row';


export const KuiFormPassword = ({ children, id, name, placeholder, className, ...rest }) => {
  const classes = classNames('kuiForm__textField', 'kuiFormPassword', className);

  return (
    <input
      type="password"
      id={id}
      name={name}
      placeholder={placeholder}
      className={classes}
      {...rest}
    />
  );
};

KuiFormPassword.propTypes = {
};

KuiFormPassword.defaultProps = {
};



