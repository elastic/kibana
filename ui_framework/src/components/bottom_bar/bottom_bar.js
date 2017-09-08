import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export const KuiBottomBar = ({
  children,
  className,
  ...rest,
}) => {
  const classes = classNames('kuiBottomBar', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      {children}
    </div>
  );
};

KuiBottomBar.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
