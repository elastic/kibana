/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiHealth, EuiToolTip } from '@elastic/eui';

import {
  type TransformHealthStatus,
  TRANSFORM_HEALTH_COLOR,
  TRANSFORM_HEALTH_DESCRIPTION,
  TRANSFORM_HEALTH_LABEL,
} from '../../../../../../common/constants';

interface TransformHealthProps {
  healthStatus: TransformHealthStatus;
  compact?: boolean;
  showToolTip?: boolean;
}

export const TransformHealthColoredDot: FC<TransformHealthProps> = ({
  healthStatus,
  compact = true,
  showToolTip = true,
}) => {
  const transformHealthDescription = TRANSFORM_HEALTH_DESCRIPTION[healthStatus];
  const transformHealthColor = TRANSFORM_HEALTH_COLOR[healthStatus];
  const transformHealthLabel = TRANSFORM_HEALTH_LABEL[healthStatus];

  const health = (
    <EuiHealth
      color={transformHealthColor}
      textSize={compact ? 'xs' : undefined}
      data-test-subj="transformListHealth"
    >
      {transformHealthLabel}
      {compact ? '' : `: ${transformHealthDescription}`}
    </EuiHealth>
  );

  if (showToolTip) {
    return <EuiToolTip content={transformHealthDescription}>{health}</EuiToolTip>;
  }

  return health;
};
