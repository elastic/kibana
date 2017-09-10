import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { KuiPanel, SIZES } from '../panel/panel';

export const KuiFlexItemPanel = ({ children, className, grow, paddingSize, ...rest }) => {
  const classes = classNames(
    'kuiFlexItem',
    {
      'kuiFlexItem--flexGrowZero': !grow,
    },
    className
  );

  return (
    <KuiPanel
      className={classes}
      paddingSize={paddingSize}
      {...rest}
    >
      {children}
    </KuiPanel>
  );
};

KuiFlexItemPanel.propTypes = {
  children: PropTypes.node,
  grow: PropTypes.bool,
  paddingSize: PropTypes.oneOf(SIZES),
};

KuiFlexItemPanel.defaultProps = {
  grow: true,
  paddingSize: 'm',
};
