/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { Axis, Chart, HistogramBarSeries, Position, ScaleType, Settings } from '@elastic/charts';

import { i18n } from '@kbn/i18n';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { MULTILAYER_TIME_AXIS_STYLE } from '@kbn/charts-plugin/common';
import type { DocumentCountStatsChangePoint } from '@kbn/aiops-log-rate-analysis';

import { documentCountChartOverallSeriesName } from './i18n';
import { getLogRateAnalysisBarStyleAccessor } from './bar_style';
import { DOCUMENT_COUNT_CHART_OVERALL_SERIES_SPEC_ID } from './constants';

interface SimpleDocumentCountChartProps {
  /** List of Kibana services that are required as dependencies */
  dependencies: {
    charts: ChartsPluginStart;
    fieldFormats: FieldFormatsStart;
    uiSettings: IUiSettingsClient;
  };
  dateHistogram: Record<string, number>;
  changePoint: DocumentCountStatsChangePoint;
}

export const SimpleDocumentCountChart: FC<SimpleDocumentCountChartProps> = ({
  dependencies,
  dateHistogram,
  changePoint,
}) => {
  const { uiSettings, fieldFormats, charts } = dependencies;

  const chartBaseTheme = charts.theme.useChartsBaseTheme();

  const xAxisFormatter = fieldFormats.deserialize({ id: 'date' });
  const useLegacyTimeAxis = uiSettings.get('visualization:useLegacyTimeAxis', false);

  // Used to highlight an auto-detected change point in the date histogram.
  const barStyleAccessor = getLogRateAnalysisBarStyleAccessor(changePoint);

  const adjustedChartPoints = Object.entries(dateHistogram).map(([time, value]) => ({
    time: Number(time),
    value,
  }));

  return (
    <Chart
      size={{
        width: '100%',
        height: 120,
      }}
    >
      <Settings
        baseTheme={chartBaseTheme}
        showLegend={false}
        showLegendExtra={false}
        locale={i18n.getLocale()}
      />
      <Axis id="aiops-histogram-left-axis" position={Position.Left} ticks={2} integersOnly />
      <Axis
        id="aiops-histogram-bottom-axis"
        position={Position.Bottom}
        showOverlappingTicks={true}
        tickFormat={(value) => xAxisFormatter.convert(value)}
        labelFormat={useLegacyTimeAxis ? undefined : () => ''}
        timeAxisLayerCount={useLegacyTimeAxis ? 0 : 2}
        style={useLegacyTimeAxis ? {} : MULTILAYER_TIME_AXIS_STYLE}
      />
      {adjustedChartPoints?.length && (
        <HistogramBarSeries
          id={DOCUMENT_COUNT_CHART_OVERALL_SERIES_SPEC_ID}
          name={documentCountChartOverallSeriesName}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="time"
          yAccessors={['value']}
          stackAccessors={['true']}
          data={adjustedChartPoints}
          // timeZone={timeZone}
          // color={barColor}
          yNice
          styleAccessor={barStyleAccessor}
        />
      )}
    </Chart>
  );
};
