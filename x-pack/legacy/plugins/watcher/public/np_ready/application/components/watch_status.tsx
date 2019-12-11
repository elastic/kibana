/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ACTION_STATES, WATCH_STATES } from '../../../../common/constants';

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case WATCH_STATES.FIRING:
    case ACTION_STATES.FIRING:
      return <EuiIcon type="play" color="primary" />;
    case WATCH_STATES.OK:
    case ACTION_STATES.OK:
    case ACTION_STATES.ACKNOWLEDGED:
      return <EuiIcon type="check" color="secondary" />;
    case ACTION_STATES.THROTTLED:
      return <EuiIcon type="clock" color="warning" />;
    case WATCH_STATES.DISABLED:
      return <EuiIcon type="minusInCircleFilled" color="subdued" />;
    case WATCH_STATES.CONFIG_ERROR:
    case WATCH_STATES.ERROR:
    case ACTION_STATES.CONFIG_ERROR:
    case ACTION_STATES.ERROR:
      return <EuiIcon type="crossInACircleFilled" color="danger" />;
  }
  return null;
}

export function WatchStatus({ status, size = 's' }: { status: string; size?: 'xs' | 's' | 'm' }) {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <StatusIcon status={status} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size={size}>{status}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
