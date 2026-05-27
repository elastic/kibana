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
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  LIGHT_THEME,
  DARK_THEME,
} from '@elastic/charts';

interface SpaceActivityChartProps {
  activityByDay: Array<{ date: string; count: number }>;
}

const formatDay = (isoDate: string): string => {
  const [, mm, dd] = isoDate.split('-');
  return new Date(0, Number(mm) - 1, Number(dd)).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
  });
};

export const SpaceActivityChart: React.FC<SpaceActivityChartProps> = ({ activityByDay }) => {
  const { colorMode, euiTheme } = useEuiTheme();

  const hasActivity = activityByDay.some((d) => d.count > 0);

  return (
    <EuiPanel hasBorder style={{ height: '100%' }}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="visBarVertical" size="m" color="primary" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>Space Activity</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            last 14 days
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      {!hasActivity ? (
        <EuiText color="subdued" size="s" textAlign="center" style={{ marginTop: 40 }}>
          <p>No activity in the last 14 days.</p>
        </EuiText>
      ) : (
        <Chart size={{ height: 180 }}>
          <Settings
            baseTheme={colorMode === 'DARK' ? DARK_THEME : LIGHT_THEME}
            theme={{
              background: { color: 'transparent' },
              barSeriesStyle: { rect: { fill: euiTheme.colors.primary } },
            }}
          />
          <Axis
            id="x"
            position={Position.Bottom}
            tickFormat={(d) => formatDay(String(d))}
            showOverlappingTicks={false}
            showOverlappingLabels={false}
          />
          <Axis id="y" position={Position.Left} ticks={4} />
          <BarSeries
            id="activity"
            data={activityByDay}
            xAccessor="date"
            yAccessors={['count']}
            xScaleType={ScaleType.Ordinal}
            yScaleType={ScaleType.Linear}
          />
        </Chart>
      )}
    </EuiPanel>
  );
};
