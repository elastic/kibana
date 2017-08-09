import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormPassword = ({ className, id, name, placeholder, value, ...rest }) => {
  const classes = classNames('kuiForm__textField', 'kuiFormPassword', className);

  return (
    <input
      type="password"
      id={id}
      name={name}
      placeholder={placeholder}
      className={classes}
      value={value}
      {...rest}
    />
  );
};

KuiFormPassword.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

KuiFormPassword.defaultProps = {
  value: undefined,
};
