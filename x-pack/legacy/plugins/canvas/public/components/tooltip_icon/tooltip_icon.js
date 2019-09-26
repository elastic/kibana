/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint react/forbid-elements: 0 */
import React from 'react';
import { PropTypes } from 'prop-types';
import { EuiIconTip } from '@elastic/eui';

export const TooltipIcon = ({ icon = 'info', ...rest }) => {
  const icons = {
    error: { type: 'alert', color: 'danger' },
    warning: { type: 'alert', color: 'warning' },
    info: { type: 'iInCircle', color: 'default' },
  };

  if (!Object.keys(icons).includes(icon)) {
    throw new Error(`Unsupported icon type: ${icon}`);
  }

  return <EuiIconTip {...rest} type={icons[icon].type} color={icons[icon].color} />;
};

TooltipIcon.propTypes = {
  icon: PropTypes.string,
};
