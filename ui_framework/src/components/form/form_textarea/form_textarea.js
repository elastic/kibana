import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormTextarea = ({ children, className, ...rest }) => {
  const classes = classNames('kuiFormTextarea', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFormTextarea.propTypes = {
};
