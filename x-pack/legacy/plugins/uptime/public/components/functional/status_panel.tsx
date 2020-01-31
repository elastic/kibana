/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';
import { Snapshot } from './snapshot';
import { PingHistogram } from '../connected';

interface StatusPanelProps {
  absoluteDateRangeStart: number;
  absoluteDateRangeEnd: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: string;
  statusFilter?: string;
}

const STATUS_CHART_HEIGHT = '160px';

export const StatusPanel = ({
  absoluteDateRangeStart,
  absoluteDateRangeEnd,
  dateRangeStart,
  dateRangeEnd,
  filters,
  statusFilter,
}: StatusPanelProps) => (
  <EuiPanel>
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem grow={2}>
        <Snapshot
          dateRangeStart={dateRangeStart}
          dateRangeEnd={dateRangeEnd}
          filters={filters}
          height={STATUS_CHART_HEIGHT}
          statusFilter={statusFilter}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={10}>
        <PingHistogram
          absoluteStartDate={absoluteDateRangeStart}
          absoluteEndDate={absoluteDateRangeEnd}
          dateStart={dateRangeStart}
          dateEnd={dateRangeEnd}
          filters={filters}
          height={STATUS_CHART_HEIGHT}
          statusFilter={statusFilter}
          isResponsive={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
