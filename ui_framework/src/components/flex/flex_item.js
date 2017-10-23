import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiFlexItem = ({ children, className, grow, ...rest }) => {
  const classes = classNames(
    'kuiFlexItem',
    {
      'kuiFlexItem--flexGrowZero': !grow,
    },
    className
  );

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
  grow: PropTypes.bool,
};

KuiFlexItem.defaultProps = {
  grow: true,
};
