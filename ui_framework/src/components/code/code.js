import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiCode = ({
  children,
  className,
  ...rest,
}) => {
  const classes = classNames('kuiCode', className);

  return (
    <code
      className={classes}
      {...rest}
    >
      {children}
    </code>
  );
};

KuiCode.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
