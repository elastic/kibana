import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

export const KuiMenu = ({
  contained,
  className,
  children,
  ...rest
}) => {
  const classes = classNames('kuiMenu', className, {
    'kuiMenu--contained': contained
  });

  return (
    <ul
      className={classes}
      {...rest}
    >
      {children}
    </ul>
  );
};

KuiMenu.propTypes = {
  contained: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node
};
