import PropTypes from 'prop-types';
import React from 'react';

import classNames from 'classnames';

export const KuiMenuItem = ({
  className,
  children,
  ...rest
}) => {
  return (
    <li
      className={classNames('kuiMenuItem', className)}
      {...rest}
    >
      {children}
    </li>
  );
};

KuiMenuItem.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node
};
