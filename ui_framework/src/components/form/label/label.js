import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiLabel = ({
  className,
  children,
  ...rest
}) => {
  const classes = classNames('kuiLabel', className);

  return (
    <label
      className={classes}
      {...rest}
    >
      {children}
    </label>
  );
};

KuiLabel.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};
