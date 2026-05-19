/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import {
  Chart,
  Partition,
  PartitionLayout,
  Settings,
  LIGHT_THEME,
  DARK_THEME,
} from '@elastic/charts';
import type { HttpStart } from '@kbn/core/public';
import type { AlertStats } from '../../../server/routes/space_context';

interface AlertsWidgetProps {
  alertStats: AlertStats;
  http: HttpStart;
}

export const AlertsWidget: React.FC<AlertsWidgetProps> = ({ alertStats, http }) => {
  const { firing, ok, error, total } = alertStats;
  const { colorMode, euiTheme } = useEuiTheme();

  const data = [
    { status: 'Firing', count: firing, color: euiTheme.colors.danger },
    { status: 'OK', count: ok, color: euiTheme.colors.success },
    { status: 'Error', count: error, color: euiTheme.colors.warning },
  ].filter((d) => d.count > 0);

  const colorMap: Record<string, string> = {
    Firing: euiTheme.colors.danger,
    OK: euiTheme.colors.success,
    Error: euiTheme.colors.warning,
  };

  return (
    <EuiPanel hasBorder style={{ height: '100%' }}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon
            type="bell"
            size="m"
            color={firing > 0 ? 'danger' : 'success'}
            aria-hidden={true}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>Alerting</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="s" />

      {total === 0 ? (
        <EuiText color="subdued" size="s" textAlign="center">
          <p>No rules configured.</p>
        </EuiText>
      ) : (
        <>
          <Chart size={{ height: 160 }}>
            <Settings
              baseTheme={colorMode === 'DARK' ? DARK_THEME : LIGHT_THEME}
              theme={{ partition: { emptySizeRatio: 0.45 }, background: { color: 'transparent' } }}
            />
            <Partition
              id="alert-donut"
              data={data}
              layout={PartitionLayout.sunburst}
              valueAccessor={(d) => d.count}
              layers={[
                {
                  groupByRollup: (d: { status: string; count: number; color: string }) => d.status,
                  nodeLabel: (d) => String(d),
                  shape: {
                    fillColor: (key) => colorMap[String(key)] ?? euiTheme.colors.primary,
                  },
                },
              ]}
            />
          </Chart>

          <EuiFlexGroup justifyContent="center" gutterSize="l">
            {data.map(({ status, count, color }) => (
              <EuiFlexItem key={status} grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: color,
                      }}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">
                      <strong>{count}</strong> {status}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}

      <EuiSpacer size="s" />

      <EuiText size="xs" color="subdued" textAlign="center">
        <p>
          {total} rule{total !== 1 ? 's' : ''} total
        </p>
      </EuiText>

      <EuiSpacer size="s" />

      <EuiText size="xs" textAlign="center">
        <EuiLink
          href={http.basePath.prepend('/app/management/insightsAndAlerting/triggersActions/rules')}
          target="_self"
        >
          View all rules →
        </EuiLink>
      </EuiText>
    </EuiPanel>
  );
};
