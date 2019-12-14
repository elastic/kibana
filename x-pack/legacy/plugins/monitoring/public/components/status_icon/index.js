/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export function StatusIcon({ type, label }) {
  const typeToIconMap = {
    [StatusIcon.TYPES.RED]: 'health-red.svg',
    [StatusIcon.TYPES.YELLOW]: 'health-yellow.svg',
    [StatusIcon.TYPES.GREEN]: 'health-green.svg',
    [StatusIcon.TYPES.GRAY]: 'health-gray.svg',
  };
  const icon = typeToIconMap[type];

  return (
    <span className="kuiStatusText">
      <img src={`../plugins/monitoring/icons/${icon}`} alt={label} data-test-subj="statusIcon" />
    </span>
  );
}

StatusIcon.TYPES = {
  RED: 'RED',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN',
  GRAY: 'GRAY',
};
