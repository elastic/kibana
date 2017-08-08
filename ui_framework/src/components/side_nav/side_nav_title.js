import React from 'react';
import classNames from 'classnames';

import {
  KuiTitle,
} from '../../components';

export const KuiSideNavTitle = ({ children, className, ...rest }) => {
  const classes = classNames('kuiSideNavTitle', className);

  return (
    <KuiTitle
      size="small"
      className={classes}
      {...rest}
    >
      <p>{children}</p>
    </KuiTitle>
  );
};

KuiSideNavTitle.propTypes = {
};
