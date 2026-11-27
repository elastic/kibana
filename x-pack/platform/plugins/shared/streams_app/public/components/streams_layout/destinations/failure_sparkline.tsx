/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AreaSeries, Chart, CurveType, ScaleType, Settings, Tooltip } from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import type { DeliverySeriesView } from '../../../services/unit_stats_client/types';

/** EUI's guidance: a sparkline is a single series of no more than 12 values. */
export const MAX_SPARKLINE_POINTS = 12;

/** The class whose share of the attempts a sparkline draws. */
type SparklineClass = 'authentication' | 'authorization';

/**
 * The share of the attempts of each bucket that the class is, in percent, in order. A bucket with
 * no attempts has no share, so it has no point and the line passes over it, where a share of 0 would
 * say that nothing failed.
 */
export const toPercentagePoints = (
  { points }: DeliverySeriesView,
  failureClass: SparklineClass
): Array<{ x: number; y: number }> =>
  points.flatMap((point) =>
    point.total > 0
      ? [{ x: Date.parse(point.start), y: (point[failureClass] / point.total) * 100 }]
      : []
  );

/**
 * Reduces a series to at most `MAX_SPARKLINE_POINTS` points, each the mean of the consecutive
 * points that it stands for, so a long window keeps its shape. A series that is short enough is not
 * changed.
 */
export const downsample = (
  converted: Array<{ x: number; y: number }>
): Array<{ x: number; y: number }> => {
  if (converted.length <= MAX_SPARKLINE_POINTS) return converted;

  return Array.from({ length: MAX_SPARKLINE_POINTS }, (_, index) => {
    const from = Math.floor((index * converted.length) / MAX_SPARKLINE_POINTS);
    const to = Math.floor(((index + 1) * converted.length) / MAX_SPARKLINE_POINTS);
    const group = converted.slice(from, Math.max(to, from + 1));
    return {
      x: group[0].x,
      y: group.reduce((sum, point) => sum + point.y, 0) / group.length,
    };
  });
};

/**
 * A small line of how the share of the attempts that a class is moves over the window, as EUI's
 * guidance for sparklines asks:
 * one series of at most 12 values, with no axes, ticks, labels, grid lines, legend or tooltip, and
 * EUI's own sparkline override of the chart theme. It is decoration for the figures beside it, which
 * say the same in words, so it is hidden from assistive technology. It draws nothing for a series
 * with fewer than two points, because one point is not a trend.
 */
export function FailureSparkline({
  series,
  failureClass,
  dataTestSubj,
}: {
  series: DeliverySeriesView;
  failureClass: SparklineClass;
  dataTestSubj?: string;
}) {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();
  const {
    dependencies: {
      start: { charts },
    },
  } = useKibana();
  const sparklineOverrides = charts.theme.useSparklineOverrides();

  const data = useMemo(
    () => downsample(toPercentagePoints(series, failureClass)),
    [series, failureClass]
  );

  if (data.length < 2) return null;

  // The window of the series, not the extent of its points, so a series of failures that began late
  // starts late, in line with the sparklines of the other classes.
  const xDomain = {
    min: Date.parse(series.window.start),
    max: Date.parse(series.window.end),
    minInterval: series.bucketMs,
  };

  return (
    <div aria-hidden="true" data-test-subj={dataTestSubj}>
      <Chart size={{ width: '100%', height: euiTheme.base * 3 }}>
        <Settings
          locale={i18n.getLocale()}
          baseTheme={chartBaseTheme}
          // EUI's sparkline override first, then a clear background so the chart takes the color of
          // whatever it sits on, and no margins, so it fills the space it is given.
          theme={[
            sparklineOverrides,
            {
              background: { color: 'transparent' },
              chartMargins: { left: 0, right: 0, top: 2, bottom: 2 },
              chartPaddings: { left: 0, right: 0, top: 0, bottom: 0 },
            },
          ]}
          showLegend={false}
          xDomain={xDomain}
          noResults={<div />}
        />
        <Tooltip type="none" />
        <AreaSeries
          id="failure-percentage"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={data}
          curve={CurveType.CURVE_MONOTONE_X}
          color={euiTheme.colors.danger}
        />
      </Chart>
    </div>
  );
}
