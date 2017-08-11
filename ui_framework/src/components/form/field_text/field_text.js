import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFieldText = ({ id, name, placeholder, value, className, ...rest }) => {
  const classes = classNames('kuiFieldText', className);

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

KuiFieldText.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

KuiFieldText.defaultProps = {
  value: undefined,
};
