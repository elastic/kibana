/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';
import { SnapshotHistogram } from './charts';
import { Snapshot } from './snapshot';
import { UptimeAppColors } from '../../uptime_app';

interface StatusPanelProps {
  absoluteDateRangeStart: number;
  absoluteDateRangeEnd: number;
  colors: UptimeAppColors;
  sharedProps: { [key: string]: any };
}

export const StatusPanel = ({
  absoluteDateRangeStart,
  absoluteDateRangeEnd,
  colors: { danger, success },
  sharedProps,
}: StatusPanelProps) => (
  <EuiPanel>
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem grow={2}>
        <Snapshot variables={sharedProps} />
      </EuiFlexItem>
      <EuiFlexItem grow={10}>
        <SnapshotHistogram
          absoluteStartDate={absoluteDateRangeStart}
          absoluteEndDate={absoluteDateRangeEnd}
          variables={sharedProps}
          height="160px"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
