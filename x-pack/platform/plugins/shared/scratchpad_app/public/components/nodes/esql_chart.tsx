/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
import {
  Chart,
  Axis,
  LineSeries,
  BarSeries,
  AreaSeries,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  CurveType,
} from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import type { ChartSeries } from '../../utils/esql_results_to_chart';

interface ESQLChartProps {
  series: ChartSeries[];
  chartType?: 'line' | 'bar' | 'area';
  height?: number;
}

export function ESQLChart({ series, chartType = 'line', height = 200 }: ESQLChartProps) {
  const chartBaseTheme = useElasticChartsTheme();
  const {
    services: { uiSettings },
  } = useKibana();
  const chartIdRef = useRef(`esql-chart-${Math.random().toString(36).substr(2, 9)}`);

  const timeZone = useMemo(() => {
    const kibanaTimeZone = uiSettings?.get<'Browser' | string>(UI_SETTINGS.DATEFORMAT_TZ);
    if (!kibanaTimeZone || kibanaTimeZone === 'Browser') {
      return 'local';
    }
    return kibanaTimeZone;
  }, [uiSettings]);

  if (series.length === 0) {
    return null;
  }

  // Determine if X axis is time-based
  const firstDataPoint = series[0]?.data[0];
  const isTimeSeries =
    firstDataPoint &&
    typeof firstDataPoint.x === 'number' &&
    firstDataPoint.x > 1000000000000; // Rough check for timestamp

  const SeriesComponent =
    chartType === 'bar' ? BarSeries : chartType === 'area' ? AreaSeries : LineSeries;

  return (
    <Chart size={{ height }} id={chartIdRef.current}>
      <Settings
        baseTheme={chartBaseTheme}
        showLegend={series.length > 1}
        legendPosition={Position.Bottom}
        locale={i18n.getLocale()}
      />
      <Tooltip />
      <Axis
        id="x-axis"
        position={Position.Bottom}
        tickFormat={(d) => {
          if (isTimeSeries && typeof d === 'number') {
            return new Date(d).toLocaleString();
          }
          return String(d);
        }}
      />
      <Axis id="y-axis" position={Position.Left} />
      {series.map((serie) => (
        <SeriesComponent
          key={serie.id}
          id={serie.id}
          name={serie.name}
          xScaleType={isTimeSeries ? ScaleType.Time : ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={serie.data}
          curve={chartType === 'line' ? CurveType.CURVE_MONOTONE_X : undefined}
          timeZone={isTimeSeries ? timeZone : undefined}
        />
      ))}
    </Chart>
  );
}
