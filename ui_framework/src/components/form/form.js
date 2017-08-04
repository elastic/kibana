import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiForm = ({ children, className, ...rest }) => {
  const classes = classNames('kuiForm', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiForm.propTypes = {
};
