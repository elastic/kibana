/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RectAnnotationDatum, AnnotationId } from '@elastic/charts';
import {
  Axis,
  BarSeries,
  Chart,
  getAxisId,
  getSpecId,
  niceTimeFormatter,
  Settings,
  TooltipValue,
  LIGHT_THEME,
  DARK_THEME,
  getAnnotationId,
  RectAnnotation,
} from '@elastic/charts';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';

import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { useKibanaUiSetting } from '../../../../../utils/use_kibana_ui_setting';
import { MLSeverityScoreCategories } from '../helpers/data_formatters';

export const AnomaliesChart: React.FunctionComponent<{
  chartId: string;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
  series: Array<{ time: number; value: number }>;
  annotations: Record<MLSeverityScoreCategories, RectAnnotationDatum[]>;
  renderAnnotationTooltip?: (details?: string) => JSX.Element;
}> = ({ chartId, series, annotations, setTimeRange, timeRange, renderAnnotationTooltip }) => {
  const [dateFormat] = useKibanaUiSetting('dateFormat', 'Y-MM-DD HH:mm:ss.SSS');
  const [isDarkMode] = useKibanaUiSetting('theme:darkMode');

  const chartDateFormatter = useMemo(
    () => niceTimeFormatter([timeRange.startTime, timeRange.endTime]),
    [timeRange]
  );

  const logEntryRateSpecId = getSpecId('averageValues');

  const tooltipProps = useMemo(
    () => ({
      headerFormatter: (tooltipData: TooltipValue) => moment(tooltipData.value).format(dateFormat),
    }),
    [dateFormat]
  );

  const handleBrushEnd = useCallback(
    (startTime: number, endTime: number) => {
      setTimeRange({
        endTime,
        startTime,
      });
    },
    [setTimeRange]
  );

  return (
    <div style={{ height: 160, width: '100%' }}>
      <Chart className="log-entry-rate-chart">
        <Axis
          id={getAxisId('timestamp')}
          position="bottom"
          showOverlappingTicks
          tickFormat={chartDateFormatter}
        />
        <Axis
          id={getAxisId('values')}
          position="left"
          tickFormat={value => numeral(value.toPrecision(3)).format('0[.][00]a')} // https://github.com/adamwdraper/Numeral-js/issues/194
        />
        <BarSeries
          id={logEntryRateSpecId}
          name={i18n.translate('xpack.infra.logs.analysis.anomaliesSectionLineSeriesName', {
            defaultMessage: 'Log entries per 15 minutes (avg)',
          })}
          xScaleType="time"
          yScaleType="linear"
          xAccessor={'time'}
          yAccessors={['value']}
          data={series}
          barSeriesStyle={barSeriesStyle}
        />
        {renderAnnotations(annotations, chartId, renderAnnotationTooltip)}
        <Settings
          onBrushEnd={handleBrushEnd}
          tooltip={tooltipProps}
          baseTheme={isDarkMode ? DARK_THEME : LIGHT_THEME}
          xDomain={{ min: timeRange.startTime, max: timeRange.endTime }}
        />
      </Chart>
    </div>
  );
};

interface SeverityConfig {
  annotationId: AnnotationId;
  style: {
    fill: string;
    opacity: number;
  };
}

const severityConfigs: Record<string, SeverityConfig> = {
  warning: {
    annotationId: getAnnotationId(`anomalies-warning`),
    style: { fill: 'rgb(125, 180, 226)', opacity: 0.7 },
  },
  minor: {
    annotationId: getAnnotationId(`anomalies-minor`),
    style: { fill: 'rgb(255, 221, 0)', opacity: 0.7 },
  },
  major: {
    annotationId: getAnnotationId(`anomalies-major`),
    style: { fill: 'rgb(229, 113, 0)', opacity: 0.7 },
  },
  critical: {
    annotationId: getAnnotationId(`anomalies-critical`),
    style: { fill: 'rgb(228, 72, 72)', opacity: 0.7 },
  },
};

const renderAnnotations = (
  annotations: Record<MLSeverityScoreCategories, RectAnnotationDatum[]>,
  chartId: string,
  renderAnnotationTooltip?: (details?: string) => JSX.Element
) => {
  return Object.entries(annotations).map((entry, index) => {
    return (
      <RectAnnotation
        key={`${chartId}:${entry[0]}`}
        dataValues={entry[1]}
        annotationId={severityConfigs[entry[0]].annotationId}
        style={severityConfigs[entry[0]].style}
        renderTooltip={renderAnnotationTooltip}
      />
    );
  });
};

const barSeriesStyle = { rect: { fill: '#D3DAE6', opacity: 0.6 } }; // TODO: Acquire this from "theme" as euiColorLightShade
