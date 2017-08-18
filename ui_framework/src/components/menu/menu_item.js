import React, {
  PropTypes,
} from 'react';

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
  className: React.PropTypes.string,
  children:  PropTypes.node
};
