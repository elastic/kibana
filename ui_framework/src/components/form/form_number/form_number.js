import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormNumber = ({ className, id, placeholder, name, min, max, value, ...rest }) => {
  const classes = classNames('kuiForm__textField', 'kuiFormNumber', className);

  return (
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
  );
};

KuiFormNumber.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  step: PropTypes.number,
  value: PropTypes.number,
};

KuiFormNumber.defaultProps = {
  value: undefined,
};

