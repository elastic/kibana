import React from 'react';

import { KuiButton } from './kui_button';
import { TrashIcon } from '../icon/trash_icon';

export function TrashButton(props) {
  return <KuiButton className="kuiButton--danger" {...props}>
    <TrashIcon />
  </KuiButton>;
}

TrashButton.PropTypes = {
  hide: React.PropTypes.bool,
  tooltip: React.PropTypes.string,
  className: React.PropTypes.string,
  // Only one of the following must be given, not both.
  onClick: React.PropTypes.func,
  href: React.PropTypes.string
};
