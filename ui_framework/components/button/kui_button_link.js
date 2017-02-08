import React from 'react';
import classnames from 'classnames';

import { KuiTooltip } from '../tooltip/kui_tooltip';

export function KuiButtonLink({ className, href, tooltip, children }) {
  const classes = classnames('kuiButton', className);
  const buttonLink = <a
    className={ classes }
    href={ href }
    aria-label={ tooltip }
    data-tip={ tooltip }
  >
    { children }
  </a>;

  return <KuiTooltip text={ tooltip }> { buttonLink } </KuiTooltip>;
}

KuiButtonLink.PropTypes = {
  tooltip: React.PropTypes.string,
  href: React.PropTypes.string,
  className: React.PropTypes.string
};
