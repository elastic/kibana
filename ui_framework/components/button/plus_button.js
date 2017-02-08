import React from 'react';

import { KuiButton } from './kui_button';
import { PlusIcon } from '../icon/plus_icon';

export function PlusButton(props) {
  return <KuiButton className="kuiButton--primary" {...props}>
    <PlusIcon />
  </KuiButton>;
}

PlusButton.PropTypes = {
  hide: React.PropTypes.bool,
  tooltip: React.PropTypes.string,
  className: React.PropTypes.string,
  // Only one of the following must be given, not both.
  onClick: React.PropTypes.func,
  href: React.PropTypes.string
};
