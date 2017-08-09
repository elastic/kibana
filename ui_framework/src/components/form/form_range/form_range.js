import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormRange = ({ children, id, name, className, ...rest }) => {
  const classes = classNames('kuiFormRange', className);

  return (
    <input
      type="range"
      id={id}
      name={name}
      className={classes}
      {...rest}
    />
  );
};

KuiFormRange.propTypes = {
};
