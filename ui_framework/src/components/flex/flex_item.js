import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiFlexItem = ({ children, className, ...rest }) => {
  const classes = classNames('kuiFlexItem', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiFlexItem.propTypes = {
  children: PropTypes.node,
};
