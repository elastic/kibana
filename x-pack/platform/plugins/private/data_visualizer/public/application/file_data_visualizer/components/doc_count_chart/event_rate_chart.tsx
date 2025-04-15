/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
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
import { euiLightVars } from '@kbn/ui-theme';
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
  const theme: PartialTheme = {
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
  };

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
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'time'}
          yAccessors={['value']}
          data={eventRateChartData}
          color={euiLightVars.euiColorVis0}
        />
      </Chart>
    </div>
  );
};
