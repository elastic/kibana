import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormCheckbox = ({ children, className, ...rest }) => {
  const classes = classNames('kuiFormCheckbox', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFormCheckbox.propTypes = {
};
