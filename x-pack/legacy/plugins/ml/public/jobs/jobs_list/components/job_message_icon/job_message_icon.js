/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';

const [INFO, WARNING, ERROR] = ['info', 'warning', 'error'];

export function JobIcon({ message, showTooltip = false }) {
  if (message !== undefined) {
    let color = 'primary';
    const icon = 'alert';

    if (message.level === INFO) {
      color = 'primary';
    } else if (message.level === WARNING) {
      color = 'warning';
    } else if (message.level === ERROR) {
      color = 'danger';
    }

    if (showTooltip) {
      return (
        <EuiToolTip
          position="bottom"
          content={message.text}
        >
          <EuiIcon type={icon} color={color} />
        </EuiToolTip>
      );
    } else {
      return (<EuiIcon type={icon} color={color} />);
    }
  } else {
    return (<span />);
  }
}
JobIcon.propTypes = {
  message: PropTypes.object,
  showTooltip: PropTypes.bool,
};
