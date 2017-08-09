import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';
import { KuiFormRow } from '../form_row';


export const KuiFormText = ({ children, icon, id, name, placeholder, className, ...rest }) => {
  const classes = classNames('kuiForm__textField', 'kuiFormText', className);

  return (
    <input
      type="text"
      id={id}
      name={name}
      placeholder={placeholder}
      className={classes}
      {...rest}
    />
  );
};

KuiFormText.propTypes = {
  icon: PropTypes.string,
};

KuiFormText.defaultProps = {
  icon: null,
};


