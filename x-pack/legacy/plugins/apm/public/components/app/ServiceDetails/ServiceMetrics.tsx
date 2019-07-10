/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useServiceMetricCharts } from '../../../hooks/useServiceMetricCharts';
import { IUrlParams } from '../../../context/UrlParamsContext/types';
import { MetricsChart } from './MetricsChart';
import { ChartsSyncContextProvider } from '../../../context/ChartsSyncContext';

interface ServiceMetricsProps {
  urlParams: IUrlParams;
  agentName?: string;
}

export function ServiceMetrics({ urlParams, agentName }: ServiceMetricsProps) {
  const { data } = useServiceMetricCharts(urlParams, agentName);
  const { start, end } = urlParams;
  return (
    <React.Fragment>
      <EuiFlexGrid columns={2} gutterSize="s">
        {data.charts.map(chart => (
          <EuiFlexItem key={chart.key}>
            <EuiPanel>
              <ChartsSyncContextProvider>
                <MetricsChart start={start} end={end} chart={chart} />
              </ChartsSyncContextProvider>
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      <EuiSpacer size="xxl" />
    </React.Fragment>
  );
}
