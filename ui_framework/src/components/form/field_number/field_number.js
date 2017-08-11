import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFieldNumber = ({ className, id, placeholder, name, min, max, value, ...rest }) => {
  const classes = classNames('kuiFieldNumber', className);

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

KuiFieldNumber.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  step: PropTypes.number,
  value: PropTypes.number,
};

KuiFieldNumber.defaultProps = {
  value: undefined,
};

