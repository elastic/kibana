import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiFormLabel = ({ children, className, ...rest }) => {
  const classes = classNames('kuiFormLabel', className);

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
};
