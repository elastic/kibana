/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiBadge, EuiToolTip } from '@elastic/eui';

import type { TransformStats } from '../../../../../../common/types/transform_stats';
import { TRANSFORM_STATE } from '../../../../../../common/constants';

// reflects https://github.com/elastic/elasticsearch/blob/master/x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/transform/transforms/TransformStats.java#L250
const STATE_COLOR = {
  aborting: 'warning',
  failed: 'danger',
  indexing: 'primary',
  started: 'primary',
  stopped: 'hollow',
  stopping: 'hollow',
  waiting: 'hollow',
} as const;

interface TransformTaskStateBadgeProps {
  state: TransformStats['state'];
  reason?: TransformStats['reason'];
}

export const TransformTaskStateBadge: FC<TransformTaskStateBadgeProps> = ({ state, reason }) => {
  const color = STATE_COLOR[state];

  if (state === TRANSFORM_STATE.FAILED && reason !== undefined) {
    return (
      <EuiToolTip content={reason}>
        <EuiBadge className="transform__TaskStateBadge" color={color}>
          {state}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  return (
    <EuiBadge className="transform__TaskStateBadge" color={color}>
      {state}
    </EuiBadge>
  );
};
