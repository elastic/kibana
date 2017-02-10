import React from 'react';

import { KuiButtonLink } from './kui_button_link';
import { CreateIcon } from '../icon/create_icon';

export function CreateButtonLink(props) {
  return <KuiButtonLink className="kuiButton--primary" {...props}>
    <CreateIcon />
  </KuiButtonLink>;
}

CreateButtonLink.propTypes = {
  tooltip: React.PropTypes.string,
  className: React.PropTypes.string,
  href: React.PropTypes.string
};
