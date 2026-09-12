/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@kbn/flot-charts';
import React from 'react';
import type { TooltipDataPoint, SparklineTooltipConfig } from '.';
import { Sparkline, SparklineTooltip } from '.';

export default {
  title: 'Monitoring/Sparkline',
};

const tooltip: SparklineTooltipConfig = {
  enabled: true,
  xValueFormatter: (v: number) => new Date(v).toISOString(),
  yValueFormatter: (v: number) => `${v.toFixed(2)} ops/s`,
};

const FIXED_EPOCH = 1_700_000_000_000;

const baseDataPoint: TooltipDataPoint = {
  xValue: FIXED_EPOCH,
  yValue: 42.5,
  xPosition: 100,
  yPosition: 100,
  plotTop: 0,
  plotLeft: 0,
  plotHeight: 200,
  plotWidth: 600,
};

const FIVE_MINUTES = 5 * 60 * 1000;
const sampleSeries: number[][] = Array.from({ length: 30 }, (_, i) => [
  FIXED_EPOCH - (30 - i) * FIVE_MINUTES,
  Math.round((20 + Math.sin(i / 3) * 15) * 100) / 100,
]);

/**
 * Temporary stories for visual sanity-checking the Bootstrap-free sparkline.
 * Hover the chart to see the tooltip with CSS-triangle carets.
 * Will be removed in the Phase 3 cleanup PR.
 */
export const FullSparkline = {
  render: () => (
    <div style={{ width: 300, padding: 24 }}>
      <Sparkline
        series={sampleSeries}
        tooltip={tooltip}
        options={{
          xaxis: { min: sampleSeries[0][0], max: sampleSeries[sampleSeries.length - 1][0] },
        }}
      />
    </div>
  ),
};

export const TooltipLeftCaret = {
  render: () => (
    <div style={{ position: 'relative', height: 200, width: 600 }}>
      <SparklineTooltip tooltip={tooltip} dataPoint={{ ...baseDataPoint, xPosition: 100 }} />
    </div>
  ),
};

export const TooltipRightCaret = {
  render: () => (
    <div style={{ position: 'relative', height: 200, width: 600 }}>
      <SparklineTooltip tooltip={tooltip} dataPoint={{ ...baseDataPoint, xPosition: 500 }} />
    </div>
  ),
};
