import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormRange = ({ className, id, name, min, max, value, ...rest }) => {
  const classes = classNames('kuiFormRange', className);

  return (
    <input
      type="range"
      id={id}
      name={name}
      className={classes}
      min={min}
      max={max}
      value={value}
      {...rest}
    />
  );
};

KuiFormRange.propTypes = {
  name: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  value: PropTypes.string,
};

KuiFormRange.defaultProps = {
  value: undefined,
  min: 1,
  max: 100,
};

