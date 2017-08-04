import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormRow = ({ children, label, className, ...rest }) => {
  const classes = classNames('kuiFormRow', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
      <label>{label}</label>
    </div>
  );
};

KuiFormRow.propTypes = {
};
