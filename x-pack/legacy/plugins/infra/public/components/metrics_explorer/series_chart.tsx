/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  ScaleType,
  getSpecId,
  SpecId,
  DataSeriesColorsValues,
  CustomSeriesColorsMap,
  AreaSeries,
  BarSeries,
  RecursivePartial,
  AreaSeriesStyle,
  BarSeriesStyle,
} from '@elastic/charts';
import { MetricsExplorerSeries } from '../../../server/routes/metrics_explorer/types';
import { colorTransformer, MetricsExplorerColor } from '../../../common/color_palette';
import { createMetricLabel } from './helpers/create_metric_label';
import {
  MetricsExplorerOptionsMetric,
  MetricsExplorerChartType,
} from '../../containers/metrics_explorer/use_metrics_explorer_options';

interface Props {
  metric: MetricsExplorerOptionsMetric;
  id: string | number;
  series: MetricsExplorerSeries;
  type: MetricsExplorerChartType;
  stack: boolean;
}

interface PropsForCharts extends Props {
  specId: SpecId;
  chartId: string;
  customColors: CustomSeriesColorsMap;
  yAccessor: string;
  color: string;
}

export const MetricExplorerSeriesChart = (props: Props) => {
  const yAccessor = `metric_${props.id}`;
  const label = createMetricLabel(props.metric);
  const specId = getSpecId(label);
  const chartId = `series-${props.series.id}-${yAccessor}`;
  const colors: DataSeriesColorsValues = {
    colorValues: [],
    specId,
  };
  const customColors: CustomSeriesColorsMap = new Map();
  const color =
    (props.metric.color && colorTransformer(props.metric.color)) ||
    colorTransformer(MetricsExplorerColor.color0);
  customColors.set(colors, color);

  const propsForCharts = {
    ...props,
    specId,
    yAccessor,
    chartId,
    color,
    customColors,
  };

  if (MetricsExplorerChartType.bar === props.type) {
    return <MetricsExplorerBarChart {...propsForCharts} />;
  }
  return <MetricsExplorerAreaChart {...propsForCharts} />;
};

export const MetricsExplorerAreaChart = ({
  specId,
  yAccessor,
  chartId,
  customColors,
  series,
  type,
  stack,
}: PropsForCharts) => {
  const seriesAreaStyle: RecursivePartial<AreaSeriesStyle> = {
    line: {
      strokeWidth: 2,
      visible: true,
    },
    area: {
      opacity: 0.5,
      visible: type === MetricsExplorerChartType.area,
    },
    point: {
      visible: true,
      radius: 2,
      strokeWidth: 2,
      opacity: 1,
    },
  };
  return (
    <AreaSeries
      key={chartId}
      id={specId}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={[yAccessor]}
      data={series.rows}
      stackAccessors={stack ? ['timestamp'] : void 0}
      areaSeriesStyle={seriesAreaStyle}
      customSeriesColors={customColors}
    />
  );
};

export const MetricsExplorerBarChart = ({
  specId,
  chartId,
  yAccessor,
  customColors,
  series,
  stack,
  color,
}: PropsForCharts) => {
  const seriesBarStyle: RecursivePartial<BarSeriesStyle> = {
    rectBorder: {
      stroke: color,
      strokeWidth: 1,
      visible: true,
    },
    rect: {
      opacity: 1,
    },
  };
  return (
    <BarSeries
      key={chartId}
      id={specId}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor="timestamp"
      yAccessors={[yAccessor]}
      data={series.rows}
      stackAccessors={stack ? ['timestamp'] : void 0}
      barSeriesStyle={seriesBarStyle}
      customSeriesColors={customColors}
    />
  );
};
