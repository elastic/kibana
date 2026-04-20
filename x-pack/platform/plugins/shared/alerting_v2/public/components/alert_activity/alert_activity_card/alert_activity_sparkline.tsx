/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Theme } from '@elastic/charts';
import { Chart, CurveType, LineSeries, ScaleType, Settings } from '@elastic/charts';
import type { AlertSummaryBucket } from '@kbn/alerting-v2-schemas';

export interface AlertActivitySparklineProps {
  series: AlertSummaryBucket[];
  /** Color token, typically danger (active) or success (recovered). */
  color: string;
  /** Accessible description for screen readers. */
  ariaLabel: string;
  /** Rendered pixel height for the sparkline. */
  height?: number;
  /**
   * Optional elastic-charts base theme. Callers inside the DI container should
   * pass the result of `charts.theme.useChartsBaseTheme()`; storybook / tests
   * can omit it and the chart will fall back to defaults.
   */
  baseTheme?: Theme;
}

/**
 * Compact inline chart used by the alert activity card. Renders a single
 * monotone line series with no axes, legend, or tooltip so it reads as a
 * sparkline rather than a full chart.
 */
export const AlertActivitySparkline = ({
  series,
  color,
  ariaLabel,
  height = 32,
  baseTheme,
}: AlertActivitySparklineProps) => {
  if (series.length === 0) {
    return <div style={{ height }} aria-label={ariaLabel} />;
  }

  return (
    <div style={{ height }} aria-label={ariaLabel}>
      <Chart size={['100%', height]}>
        <Settings
          baseTheme={baseTheme}
          showLegend={false}
          theme={{
            chartMargins: { top: 0, right: 0, bottom: 0, left: 0 },
            chartPaddings: { top: 0, right: 0, bottom: 0, left: 0 },
          }}
        />
        <LineSeries
          id="sparkline"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="key"
          yAccessors={['doc_count']}
          data={series}
          color={[color]}
          curve={CurveType.CURVE_MONOTONE_X}
          lineSeriesStyle={{
            line: { strokeWidth: 2 },
            point: { visible: 'never' },
          }}
        />
      </Chart>
    </div>
  );
};
