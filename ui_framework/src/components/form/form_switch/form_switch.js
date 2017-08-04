import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormSwitch = ({ children, className, ...rest }) => {
  const classes = classNames('kuiFormSwitch', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFormSwitch.propTypes = {
};
