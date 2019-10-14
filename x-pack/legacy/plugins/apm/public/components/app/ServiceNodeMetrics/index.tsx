/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiHorizontalRule,
  EuiFlexGrid,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiToolTip
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { ApmHeader } from '../../shared/ApmHeader';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useAgentName } from '../../../hooks/useAgentName';
import { useServiceMetricCharts } from '../../../hooks/useServiceMetricCharts';
import { ChartsSyncContextProvider } from '../../../context/ChartsSyncContext';
import { MetricsChart } from '../../shared/charts/MetricsChart';
import { useFetcher, FETCH_STATUS } from '../../../hooks/useFetcher';
import { truncate, px, unit } from '../../../style/variables';

const INITIAL_DATA = {
  host: '',
  containerId: ''
};

const Truncate = styled.span`
  display: block;
  ${truncate(px(unit * 12))}
`;

export function ServiceNodeMetrics() {
  const { urlParams, uiFilters } = useUrlParams();
  const { serviceName, serviceNodeName } = urlParams;

  const { agentName } = useAgentName();
  const { data } = useServiceMetricCharts(urlParams, agentName);
  const { start, end } = urlParams;

  const { data: { host, containerId } = INITIAL_DATA, status } = useFetcher(
    callApmApi => {
      if (serviceName && serviceNodeName && start && end) {
        return callApmApi({
          pathname:
            '/api/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
          params: {
            path: { serviceName, serviceNodeName },
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters)
            }
          }
        });
      }
    },
    [serviceName, serviceNodeName, start, end, uiFilters]
  );

  const isLoading = status === FETCH_STATUS.LOADING;

  return (
    <div>
      <ApmHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>{serviceName}</h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ApmHeader>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="s"
            isLoading={isLoading}
            description={i18n.translate('xpack.apm.serviceNodeMetrics.host', {
              defaultMessage: 'Host'
            })}
            title={
              <EuiToolTip content={host}>
                <Truncate>{host}</Truncate>
              </EuiToolTip>
            }
          ></EuiStat>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            titleSize="s"
            isLoading={isLoading}
            description={i18n.translate(
              'xpack.apm.serviceNodeMetrics.containerId',
              {
                defaultMessage: 'Container ID'
              }
            )}
            title={
              <EuiToolTip content={containerId}>
                <Truncate>{containerId}</Truncate>
              </EuiToolTip>
            }
          ></EuiStat>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="m" />
      {agentName && serviceNodeName && (
        <ChartsSyncContextProvider>
          <EuiFlexGrid columns={2} gutterSize="s">
            {data.charts.map(chart => (
              <EuiFlexItem key={chart.key}>
                <EuiPanel>
                  <MetricsChart start={start} end={end} chart={chart} />
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
          <EuiSpacer size="xxl" />
        </ChartsSyncContextProvider>
      )}
    </div>
  );
}
