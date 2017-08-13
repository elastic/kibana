import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiFormLabel = ({ children, isFocused, isInvalid, className, ...rest }) => {
  const classes = classNames('kuiFormLabel', className, {
    'kuiFormLabel-isFocused': isFocused,
    'kuiFormLabel-isInvalid': isInvalid,
  });

  return (
    <label
      className={classes}
      {...rest}
    >
      {children}
    </label>
  );
};

KuiFormLabel.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  isFocused: PropTypes.bool,
  isInvalid: PropTypes.bool,
};
