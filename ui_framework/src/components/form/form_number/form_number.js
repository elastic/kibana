import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormNumber = ({ children, className, id, name, min, max, ...rest }) => {
  const classes = classNames('kuiForm__textField', 'kuiFormNumber', className);

  return (
    <input
      type="number"
      id={id}
      min={min}
      max={max}
      name={name}
      className={classes}
      {...rest}
    />
  );
};

KuiFormNumber.propTypes = {
};
