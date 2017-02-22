import React from 'react';
import classnames from 'classnames';

import { KuiTooltip } from '../tooltip/kui_tooltip';

export function KuiButton({ className, onClick, tooltip, disabled, children }) {
  const classes = classnames('kuiButton', className);
  const button = <button
    className={classes}
    aria-label={tooltip}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>;

  return tooltip ? <KuiTooltip text={tooltip}>{button}</KuiTooltip> : button;
}

KuiButton.propTypes = {
  tooltip: React.PropTypes.string,
  className: React.PropTypes.string,
  onClick: React.PropTypes.func.isRequired,
  children: React.PropTypes.node,
  disabled: React.PropTypes.bool
};
