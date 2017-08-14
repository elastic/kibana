import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiExpressionItem = ({
  children,
  className,
  ...rest
}) => {
  const classes = classNames('kuiExpressionItem', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiExpressionItem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};
