import React from 'react';
import classnames from 'classnames';

import { KuiButton } from './kui_button';

export function KuiButtonBasic({ className, onClick, tooltip, disabled, children }) {
  return <KuiButton
    className={classnames('kuiButton--basic', className)}
    tooltip={tooltip}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </KuiButton>;
}

KuiButtonBasic.propTypes = {
  tooltip: React.PropTypes.string,
  className: React.PropTypes.string,
  onClick: React.PropTypes.func.isRequired,
  children: React.PropTypes.node,
  disabled: React.PropTypes.bool
};
