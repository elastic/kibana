import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiRange = ({ className, id, name, min, max, fullWidth, value, ...rest }) => {
  const classes = classNames(
    'kuiRange',
    {
      'kuiRange--fullWidth': fullWidth,
    },
    className
  );

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

KuiRange.propTypes = {
  name: PropTypes.string,
  id: PropTypes.string,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  value: PropTypes.string,
  fullWidth: PropTypes.bool,
};

KuiRange.defaultProps = {
  min: 1,
  max: 100,
  fullWidth: false,
};
