import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFieldPassword = ({ className, id, name, placeholder, value, ...rest }) => {
  const classes = classNames('kuiFieldPassword', className);

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

KuiFieldPassword.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

KuiFieldPassword.defaultProps = {
  value: undefined,
};
