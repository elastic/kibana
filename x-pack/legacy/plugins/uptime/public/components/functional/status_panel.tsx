/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';
import { SnapshotHistogram } from './charts';
import { Snapshot } from './snapshot';

interface StatusPanelProps {
  absoluteDateRangeStart: number;
  absoluteDateRangeEnd: number;
  sharedProps: { [key: string]: any };
}

export const StatusPanel = ({
  absoluteDateRangeStart,
  absoluteDateRangeEnd,
  sharedProps,
}: StatusPanelProps) => (
  <EuiPanel>
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem grow={2}>
        <Snapshot variables={sharedProps} height="160px" />
      </EuiFlexItem>
      <EuiFlexItem grow={10}>
        <SnapshotHistogram
          absoluteStartDate={absoluteDateRangeStart}
          absoluteEndDate={absoluteDateRangeEnd}
          height="160px"
          isResponsive={true}
          variables={sharedProps}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
