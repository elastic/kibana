import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiLabel = ({
  className,
  text,
  htmlFor,
  children,
  ...rest
}) => {
  const classes = classNames('kuiLabel', className);

  return (
    <label
      className={classes}
      htmlFor={htmlFor}
      {...rest}
    >
      {text}
      {children}
    </label>
  );
};

KuiLabel.propTypes = {
  className: PropTypes.string,
  text: PropTypes.string,
  htmlFor: PropTypes.string,
  children: PropTypes.node,
};
