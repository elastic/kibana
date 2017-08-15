import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiFormErrorText = ({ children, className, ...rest }) => {
  const classes = classNames('kuiFormErrorText', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFormErrorText.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
