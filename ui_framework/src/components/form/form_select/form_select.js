import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormSelect = ({ children, className, ...rest }) => {
  const classes = classNames('kuiFormSelect', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFormSelect.propTypes = {
};
