/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { Chart, HistogramBarSeries, ScaleType, Settings } from '@elastic/charts';

import { i18n } from '@kbn/i18n';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DocumentCountStatsChangePoint } from '@kbn/aiops-log-rate-analysis';
import { getTimeZone } from '@kbn/visualization-utils';

import { DocumentCountChartAxisX, DocumentCountChartAxisY } from './axis';
import { documentCountChartOverallSeriesName } from './i18n';
import { getLogRateAnalysisBarStyleAccessor } from './bar_style';
import {
  DOCUMENT_COUNT_CHART_DEFFAULT_HEIGHT,
  DOCUMENT_COUNT_CHART_OVERALL_SERIES_SPEC_ID,
} from './constants';

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
  const timeZone = getTimeZone(uiSettings);

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
        height: DOCUMENT_COUNT_CHART_DEFFAULT_HEIGHT,
      }}
    >
      <Settings
        baseTheme={chartBaseTheme}
        showLegend={false}
        showLegendExtra={false}
        locale={i18n.getLocale()}
      />
      <DocumentCountChartAxisX />
      <DocumentCountChartAxisY formatter={xAxisFormatter} useLegacyTimeAxis={useLegacyTimeAxis} />
      <HistogramBarSeries
        id={DOCUMENT_COUNT_CHART_OVERALL_SERIES_SPEC_ID}
        name={documentCountChartOverallSeriesName}
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor="time"
        yAccessors={['value']}
        stackAccessors={['true']}
        data={adjustedChartPoints}
        timeZone={timeZone}
        yNice
        styleAccessor={barStyleAccessor}
      />
    </Chart>
  );
};
