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

interface TopIndicesChartProps {
  topIndices: Array<{ index: string; docs: number }>;
}

const formatDocs = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

export const TopIndicesChart: React.FC<TopIndicesChartProps> = ({ topIndices }) => {
  const { colorMode, euiTheme } = useEuiTheme();

  if (topIndices.length === 0) {
    return (
      <EuiPanel hasBorder style={{ height: '100%' }}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="indexOpen" size="m" color="primary" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>Top Indices</h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText color="subdued" size="s" textAlign="center" style={{ marginTop: 40 }}>
          <p>No user indices found.</p>
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder style={{ height: '100%' }}>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="indexOpen" size="m" color="primary" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>Top Indices</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            by doc count
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <Chart size={{ height: 200 }}>
        <Settings
          rotation={90}
          baseTheme={colorMode === 'DARK' ? DARK_THEME : LIGHT_THEME}
          theme={{
            background: { color: 'transparent' },
            barSeriesStyle: { rect: { fill: euiTheme.colors.accent } },
          }}
        />
        <Axis id="index-names" position={Position.Left} />
        <Axis
          id="doc-counts"
          position={Position.Bottom}
          tickFormat={(d) => formatDocs(Number(d))}
        />
        <BarSeries
          id="top-indices"
          data={topIndices}
          xAccessor="index"
          yAccessors={['docs']}
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Linear}
        />
      </Chart>
    </EuiPanel>
  );
};
