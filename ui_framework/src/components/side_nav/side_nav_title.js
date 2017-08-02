import React, {
  PropTypes,
} from 'react';
import classNames from 'classnames';

import {
  KuiTitle,
} from '../../../../components';

export const KuiSideNavTitle = ({ children, className, ...rest }) => {
  const classes = classNames('kuiSideNavTitle', className);

  return (
    <div
      className={classes}
      {...rest}
    >
      <KuiTitle size="small">
        <h4>{children}</h4>
      </KuiTitle>
    </div>
  );
};

KuiSideNavTitle.propTypes = {
};
