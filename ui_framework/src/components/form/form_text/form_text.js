import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

export const KuiFormText = ({ children, className, ...rest }) => {
  const classes = classNames('kuiFormText', className);

  return (
    <input
      type="text"
      className={classes}
      {...rest}
    />
  );
};

KuiFormText.propTypes = {
};
