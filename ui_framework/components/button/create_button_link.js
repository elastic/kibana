import React from 'react';

import classnames from 'classnames';
import { KuiButtonLink } from './kui_button_link';
import { CreateIcon } from '../icon';

export function CreateButtonLink(props) {
  const { className, ...rest } = props;
  const classes = classnames('kuiButton--primary', className);
  return <KuiButtonLink className={classes} {...rest}>
    <CreateIcon />
  </KuiButtonLink>;
}

CreateButtonLink.propTypes = {
  tooltip: React.PropTypes.string,
  className: React.PropTypes.string,
  href: React.PropTypes.string.isRequired
};
