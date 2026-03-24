/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import '@elastic/charts/dist/theme_light.css';

const MOCK_DATA = [
  { category: 'Logs', count: 120 },
  { category: 'Metrics', count: 85 },
  { category: 'Traces', count: 64 },
  { category: 'Alerts', count: 42 },
  { category: 'Events', count: 97 },
];

const isDarkMode =
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const App = () => {
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
        Elastic Charts – MCP App
      </h1>
      <div style={{ height: 300 }}>
        <Chart>
          <Settings
            showLegend={false}
            theme={{ background: { color: 'transparent' } }}
            baseTheme={isDarkMode ? DARK_THEME : LIGHT_THEME}
          />
          <Axis id="bottom" position={Position.Bottom} title="Category" />
          <Axis id="left" position={Position.Left} title="Count" />
          <BarSeries
            id="mock-data"
            xScaleType={ScaleType.Ordinal}
            yScaleType={ScaleType.Linear}
            xAccessor="category"
            yAccessors={['count']}
            data={MOCK_DATA}
          />
        </Chart>
      </div>
    </div>
  );
};
