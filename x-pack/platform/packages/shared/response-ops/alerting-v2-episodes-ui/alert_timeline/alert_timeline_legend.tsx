/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import {
  ALERT_TIMELINE_STATUS_LEGEND_ORDER,
  alertTimelineStatusLabel,
} from './alert_timeline_status_palette';
import { AlertTimelineStatusDot } from './alert_timeline_status_dot';

const DOT_SIZE = '10px';

export const AlertTimelineLegend: React.FC = () => {
  const items = ALERT_TIMELINE_STATUS_LEGEND_ORDER.map((status) => ({
    key: status,
    sample: <AlertTimelineStatusDot status={status} size={DOT_SIZE} />,
    label: alertTimelineStatusLabel(status),
  }));

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="center"
      responsive={false}
      data-test-subj="alertTimelineLegend"
    >
      {items.map(({ key, sample, label }) => (
        <EuiFlexItem grow={false} key={key}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>{sample}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {label}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
