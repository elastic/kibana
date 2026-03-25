/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  Chart,
  BarSeries,
  Axis,
  ScaleType,
  Settings,
  Position,
  LIGHT_THEME,
  DARK_THEME,
} from '@elastic/charts';
import { useApp } from '@modelcontextprotocol/ext-apps/react';
import '@elastic/charts/dist/theme_light.css';

interface DataPoint {
  timestamp: number;
  date: string;
  count: number;
}

const isDarkMode =
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const App = () => {
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, error: connectionError } = useApp({
    appInfo: { name: 'Chart MCP App', version: '1.0.0' },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => {
        if (result.isError) {
          const text = result.content?.find((c) => c.type === 'text');
          setError(text && 'text' in text ? text.text : 'Unknown error');
          return;
        }

        const structured = result.structuredContent as { chartData?: DataPoint[] } | undefined;
        if (structured?.chartData) {
          setChartData(structured.chartData);
        }
      };
    },
  });

  if (connectionError) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <strong>Connection error:</strong> {connectionError.message}
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>Connecting…</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#c00' }}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        Waiting for data…
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          marginBottom: '1rem',
          textAlign: 'center',
        }}
      >
        kibana_sample_data_logs — requests over time
      </h1>
      <div style={{ height: 300 }}>
        <Chart>
          <Settings
            showLegend={false}
            theme={{ background: { color: 'transparent' } }}
            baseTheme={isDarkMode ? DARK_THEME : LIGHT_THEME}
          />
          <Axis
            id="bottom"
            position={Position.Bottom}
            title="Date"
            tickFormat={(d) => {
              const date = new Date(d);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <Axis id="left" position={Position.Left} title="Count" />
          <BarSeries
            id="logs-over-time"
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="timestamp"
            yAccessors={['count']}
            data={chartData}
          />
        </Chart>
      </div>
    </div>
  );
};
