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
    <pre
      className={classes}
      {...rest}
    >
      {children}
    </pre>
  );
};

KuiCode.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
