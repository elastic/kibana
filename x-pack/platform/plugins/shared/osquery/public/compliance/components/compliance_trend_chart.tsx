/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Chart, Settings, LineSeries, Axis, ScaleType } from '@elastic/charts';
import { EuiPanel, EuiTitle, EuiText } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';

interface Props {
  trend: Array<{ timestamp: string; score: number }>;
}

const CHART_SIZE = { height: 200 };
const Y_DOMAIN = { min: 0, max: 100 };

const formatTimeTick = (v: number) => new Date(v).toLocaleTimeString();
const formatScoreTick = (v: number) => `${v}%`;

export const ComplianceTrendChart: React.FC<Props> = ({ trend }) => {
  const { euiTheme } = useEuiTheme();
  const lineColor = euiTheme.colors.primary;

  const data = useMemo(
    () => trend.map((d) => ({ x: new Date(d.timestamp).getTime(), y: d.score })),
    [trend]
  );

  if (data.length === 0) {
    return (
      <EuiPanel hasBorder>
        <EuiTitle size="xs">
          <h3>Score Trend</h3>
        </EuiTitle>
        <EuiText size="s" color="subdued" textAlign="center">
          <p>No trend data available yet. Scores will appear after compliance checks run.</p>
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder>
      <EuiTitle size="xs">
        <h3>Score Trend</h3>
      </EuiTitle>
      <Chart size={CHART_SIZE}>
        <Settings showLegend={false} />
        <Axis id="time" position="bottom" tickFormat={formatTimeTick} />
        <Axis id="score" position="left" domain={Y_DOMAIN} tickFormat={formatScoreTick} />
        <LineSeries
          id="score-trend"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          data={data}
          xAccessor="x"
          yAccessors={Y_ACCESSORS}
          color={lineColor}
        />
      </Chart>
    </EuiPanel>
  );
};

const Y_ACCESSORS = ['y'];
