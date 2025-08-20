/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PartialTheme, TickFormatter } from '@elastic/charts';
import {
  AnnotationDomainType,
  Axis,
  BarSeries,
  Chart,
  CurveType,
  LineAnnotation,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  niceTimeFormatter,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { StreamsChartTooltip } from '../streams_chart_tooltip';

export interface SparkPlotAnnotation {
  id: string;
  x: number;
  color: string;
  icon: React.ReactNode;
  label: React.ReactNode;
}

export function SparkPlot({
  id,
  name,
  type,
  timeseries,
  annotations,
  compressed,
  xFormatter: givenXFormatter,
}: {
  id: string;
  name?: string;
  type: 'line' | 'bar';
  timeseries: Array<{ x: number; y: number | null }>;
  annotations?: SparkPlotAnnotation[];
  compressed?: boolean;
  xFormatter?: TickFormatter;
}) {
  const {
    dependencies: {
      start: { charts },
    },
  } = useKibana();

  const baseTheme = charts.theme.useChartsBaseTheme();

  const defaultTheme = charts.theme.chartsDefaultBaseTheme;

  const sparkplotChartTheme: PartialTheme = {
    chartMargins: { left: 0, right: 0, top: 0, bottom: 0 },
    chartPaddings: {
      top: 12,
      bottom: 12,
    },
    lineSeriesStyle: {
      point: { opacity: 0 },
    },
    areaSeriesStyle: {
      point: { opacity: 0 },
    },
    background: {
      color: `rgba(0,0,0,0)`,
    },
    axes: {
      tickLine: {
        visible: false,
      },
      gridLine: {
        horizontal: {
          visible: false,
        },
      },
    },
  };

  const min = timeseries[0]?.x;
  const max = timeseries[timeseries.length - 1]?.x;

  const defaultXFormatter = useMemo(() => {
    return niceTimeFormatter([min, max]);
  }, [min, max]);

  const xFormatter = givenXFormatter || defaultXFormatter;

  return (
    <Chart
      size={{
        width: '100%',
        height: !compressed ? 144 : 48,
      }}
    >
      <Tooltip
        headerFormatter={(data) => {
          return xFormatter(data.value);
        }}
      />
      <Axis id="y_axis" position="left" hide domain={{ min: 0, max: NaN }} />
      <Axis id="x_axis" position="bottom" hide={compressed} />
      <Settings
        theme={[sparkplotChartTheme, baseTheme]}
        baseTheme={defaultTheme}
        showLegend={false}
        locale={i18n.getLocale()}
      />
      {type && type === 'bar' ? (
        <BarSeries
          id={id}
          name={name || id}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={timeseries}
          enableHistogramMode
          yNice
        />
      ) : (
        <LineSeries
          id={id}
          name={name || id}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor={'x'}
          yAccessors={['y']}
          data={timeseries}
          curve={CurveType.CURVE_MONOTONE_X}
        />
      )}
      {annotations?.map((annotation) => {
        return (
          <LineAnnotation
            key={annotation.id}
            id={annotation.id}
            dataValues={[{ dataValue: annotation.x }]}
            domainType={AnnotationDomainType.XDomain}
            marker={annotation.icon}
            markerPosition={Position.Bottom}
            style={{
              line: {
                strokeWidth: 2,
                stroke: annotation.color,
              },
            }}
            customTooltip={() => {
              return <StreamsChartTooltip label={annotation.label} color={annotation.color} />;
            }}
          />
        );
      })}
    </Chart>
  );
}
