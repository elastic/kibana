/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { PingHistogram, DurationChart } from '../connected';

interface MonitorChartsProps {
  monitorId: string;
}

export const MonitorCharts = ({ monitorId }: MonitorChartsProps) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <DurationChart monitorId={monitorId} />
      </EuiFlexItem>
      <EuiFlexItem>
        <PingHistogram height="400px" isResponsive={false} monitorId={monitorId} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
