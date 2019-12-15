/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';

export function StatusIcon({ type, label }) {
  const typeToIconMap = {
    [StatusIcon.TYPES.RED]: 'danger',
    [StatusIcon.TYPES.YELLOW]: 'warning',
    [StatusIcon.TYPES.GREEN]: 'success',
    [StatusIcon.TYPES.GRAY]: 'subdued',
  };
  const icon = typeToIconMap[type];

  return <EuiIcon alt={label} size="l" data-test-subj="statusIcon" type="dot" color={icon} />;
}

StatusIcon.TYPES = {
  RED: 'RED',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN',
  GRAY: 'GRAY',
};
