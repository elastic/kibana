/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type FC } from 'react';

import type { PartialTheme } from '@elastic/charts';
import {
  HistogramBarSeries,
  Chart,
  ScaleType,
  Settings,
  Tooltip,
  TooltipType,
} from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';

import { i18n } from '@kbn/i18n';

import { Axes } from './axes';

export interface LineChartPoint {
  time: number | string;
  value: number;
}

interface Props {
  eventRateChartData: LineChartPoint[];
  height: string;
  width: string;
}

export const EventRateChart: FC<Props> = ({ eventRateChartData, height, width }) => {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();
  const theme: PartialTheme = useMemo(
    () => ({
      scales: { histogramPadding: 0.2 },
      background: {
        color: 'transparent',
      },
      axes: {
        gridLine: {
          horizontal: {
            stroke: euiTheme.colors.lightShade,
          },
          vertical: {
            stroke: euiTheme.colors.lightShade,
          },
        },
      },
    }),
    [euiTheme]
  );

  return (
    <div
      style={{ width, height }}
      data-test-subj={`dataVisualizerEventRateChart ${
        eventRateChartData.length ? 'withData' : 'empty'
      }`}
    >
      <Chart>
        <Axes />
        <Tooltip type={TooltipType.None} />
        <Settings theme={theme} locale={i18n.getLocale()} baseTheme={chartBaseTheme} />

        <HistogramBarSeries
          id="event_rate"
          // Defaults to multi layer time axis as of Elastic Charts v70
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'time'}
          yAccessors={['value']}
          data={eventRateChartData}
          // Amsterdam + Borealis
          color={euiTheme.colors.vis.euiColorVis0}
        />
      </Chart>
    </div>
  );
};
