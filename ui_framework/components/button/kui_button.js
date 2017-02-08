import React from 'react';
import classnames from 'classnames';

import { KuiButtonLink } from './kui_button_link';
import { KuiTooltip } from '../tooltip/kui_tooltip';

export function KuiButton(props) {
  if (props.href && props.onClick) {
    throw new Error('Only href or onClick can be defined, not both');
  }

  if (props.hide) return null;

  const classes = classnames('kuiButton', props.className);

  if (props.href) {
    return <KuiButtonLink {...props} />;
  } else {
    return <KuiTooltip text={ props.tooltip }>
      <button
        className={ classes }
        aria-label={ props.tooltip }
        onClick={ props.onClick }
      >
        { props.children }
      </button>
    </KuiTooltip>;
  }
}

KuiButton.PropTypes = {
  hide: React.PropTypes.bool,
  tooltip: React.PropTypes.string,
  className: React.PropTypes.string,
  // Only one of the following must be given, not both.
  onClick: React.PropTypes.func,
  href: React.PropTypes.string
};
