/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Chart, Settings, Goal } from '@elastic/charts';

import type { GaugeState, EsqlData } from '../types';
import { toRowObjects, colName, colLabel } from './data_utils';
import { baseTheme, transparentBackground, isDarkMode } from './chart_theme';

interface GaugeRendererProps {
  spec: GaugeState;
  data: EsqlData;
}

export const GaugeRenderer: React.FC<GaugeRendererProps> = ({ spec, data }) => {
  const rows = toRowObjects(data);
  const row = rows[0] ?? {};

  const value = Number(row[colName(spec.metric)] ?? 0);
  const min = spec.metric.min ? Number(row[colName(spec.metric.min)] ?? 0) : 0;
  const max = spec.metric.max ? Number(row[colName(spec.metric.max)] ?? 100) : 100;
  const goal = spec.metric.goal ? Number(row[colName(spec.metric.goal)] ?? max) : undefined;

  const bands = goal !== undefined ? [min, goal, max] : [min, max];

  const bandColors = isDarkMode ? ['#3c6e71', '#284b63'] : ['#d6e4ff', '#a3c4f3'];

  return (
    <Chart>
      <Settings theme={transparentBackground} baseTheme={baseTheme} />
      <Goal
        id="gauge"
        subtype={
          spec.shape?.type === 'arc' ||
          spec.shape?.type === 'semi_circle' ||
          spec.shape?.type === 'circle'
            ? 'goal'
            : 'horizontalBullet'
        }
        base={min}
        target={goal ?? max}
        actual={value}
        bands={bands}
        bandFillColor={(input: { index: number; value: number; base: number; target: number }) =>
          bandColors[input.index % bandColors.length] ?? bandColors[0]
        }
        ticks={[min, max]}
        tickValueFormatter={({ value: v }: { value: number }) => String(Math.round(v))}
        labelMajor={colLabel(spec.metric)}
        labelMinor=""
        centralMajor={String(Math.round(value * 100) / 100)}
        centralMinor=""
      />
    </Chart>
  );
};
