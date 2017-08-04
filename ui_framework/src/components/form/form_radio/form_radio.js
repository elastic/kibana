import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormRadio = ({ children, className, ...rest }) => {
  const classes = classNames('kuiFormRadio', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFormRadio.propTypes = {
};
