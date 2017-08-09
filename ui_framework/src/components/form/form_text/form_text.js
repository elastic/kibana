import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormText = ({ id, name, placeholder, value, className, ...rest }) => {
  const classes = classNames('kuiForm__textField', 'kuiFormText', className);

  return (
    <input
      type="text"
      id={id}
      name={name}
      placeholder={placeholder}
      className={classes}
      value={value}
      {...rest}
    />
  );
};

KuiFormText.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

KuiFormText.defaultProps = {
  value: undefined,
};
