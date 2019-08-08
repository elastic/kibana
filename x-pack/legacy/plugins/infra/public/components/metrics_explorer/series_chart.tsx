/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  ScaleType,
  getSpecId,
  DataSeriesColorsValues,
  CustomSeriesColorsMap,
  AreaSeries,
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

export const MetricExplorerSeriesChart = ({ metric, id, series, type, stack }: Props) => {
  const color =
    (metric.color && colorTransformer(metric.color)) ||
    colorTransformer(MetricsExplorerColor.color0);

  const yAccessor = `metric_${id}`;
  const specId = getSpecId(yAccessor);
  const colors: DataSeriesColorsValues = {
    colorValues: [],
    specId,
  };
  const customColors: CustomSeriesColorsMap = new Map();
  customColors.set(colors, color);
  const chartId = `series-${series.id}-${yAccessor}`;

  const seriesAreaStyle = {
    line: {
      stroke: color,
      strokeWidth: 2,
      visible: true,
    },
    area: {
      fill: color,
      opacity: 0.5,
      visible: type === MetricsExplorerChartType.area,
    },
    border: {
      visible: false,
      strokeWidth: 2,
      stroke: color,
    },
    point: {
      visible: false,
      radius: 0.2,
      stroke: color,
      strokeWidth: 2,
      opacity: 1,
    },
  };
  return (
    <AreaSeries
      key={chartId}
      id={specId}
      name={createMetricLabel(metric)}
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
