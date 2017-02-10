import React from 'react';

import { KuiButton } from './kui_button';
import { DeleteIcon } from '../icon/delete_icon';

export function DeleteButton(props) {
  return <KuiButton className="kuiButton--danger" {...props}>
    <DeleteIcon />
  </KuiButton>;
}

DeleteButton.propTypes = {
  tooltip: React.PropTypes.string,
  className: React.PropTypes.string,
  onClick: React.PropTypes.func
};
