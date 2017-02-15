import React from 'react';
import classnames from 'classnames';

import { KuiTooltip } from '../tooltip/kui_tooltip';

export function KuiButton({ className, onClick, tooltip, children }) {
  const classes = classnames('kuiButton', className);
  const button = <button
    className={ classes }
    aria-label={ tooltip }
    onClick={ onClick }
  >
    { children }
  </button>;

  return tooltip ? <KuiTooltip text={ tooltip }>{ button } </KuiTooltip> : button;
}

KuiButton.propTypes = {
  tooltip: React.PropTypes.string,
  className: React.PropTypes.string,
  onClick: React.PropTypes.func,
  children: React.PropTypes.array
};
