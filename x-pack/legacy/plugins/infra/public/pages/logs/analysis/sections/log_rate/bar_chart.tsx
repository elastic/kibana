/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  BarSeries,
  Chart,
  getAnnotationId,
  getAxisId,
  getSpecId,
  niceTimeFormatter,
  RectAnnotation,
  RectAnnotationDatum,
  Settings,
  TooltipValue,
  LIGHT_THEME,
  DARK_THEME,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';

import { GetLogEntryRateSuccessResponsePayload } from '../../../../../../common/http_api/log_analysis/results/log_entry_rate';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { useKibanaUiSetting } from '../../../../../utils/use_kibana_ui_setting';

type LogEntryRateHistogramBuckets = GetLogEntryRateSuccessResponsePayload['data']['histogramBuckets'];

export const LogEntryRateBarChart: React.FunctionComponent<{
  bucketDuration: number;
  histogramBuckets: LogEntryRateHistogramBuckets | null;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
}> = ({ bucketDuration, histogramBuckets, setTimeRange, timeRange }) => {
  const [dateFormat] = useKibanaUiSetting('dateFormat');
  const [isDarkMode] = useKibanaUiSetting('theme:darkMode');

  const chartDateFormatter = useMemo(
    () => niceTimeFormatter([timeRange.startTime, timeRange.endTime]),
    [timeRange]
  );

  const logEntryRateSeries = useMemo(
    () =>
      histogramBuckets
        ? histogramBuckets.reduce<Array<{ group: string; time: number; value: number }>>(
            (buckets, bucket) => {
              return [
                ...buckets,
                ...bucket.dataSets.map(dataSet => ({
                  group: dataSet.dataSetId === '' ? 'unknown' : dataSet.dataSetId,
                  time: bucket.startTime,
                  value: dataSet.averageActualLogEntryRate,
                })),
              ];
            },
            []
          )
        : [],
    [histogramBuckets]
  );

  const logEntryRateAnomalyAnnotations = useMemo(
    () =>
      histogramBuckets
        ? histogramBuckets.reduce<RectAnnotationDatum[]>((annotatedBuckets, bucket) => {
            const anomalies = bucket.dataSets.reduce<typeof bucket['dataSets'][0]['anomalies']>(
              (accumulatedAnomalies, dataSet) => [...accumulatedAnomalies, ...dataSet.anomalies],
              []
            );
            if (anomalies.length <= 0) {
              return annotatedBuckets;
            }
            return [
              ...annotatedBuckets,
              {
                coordinates: {
                  x0: bucket.startTime,
                  x1: bucket.startTime + bucketDuration,
                },
                details: i18n.translate(
                  'xpack.infra.logs.analysis.logRateSectionAnomalyCountTooltipLabel',
                  {
                    defaultMessage: `{anomalyCount, plural, one {# anomaly} other {# anomalies}}`,
                    values: {
                      anomalyCount: anomalies.length,
                    },
                  }
                ),
              },
            ];
          }, [])
        : [],
    [histogramBuckets]
  );

  const logEntryRateSpecId = getSpecId('averageValues');
  const logEntryRateAnomalyAnnotationsId = getAnnotationId('anomalies');

  const tooltipProps = useMemo(
    () => ({
      headerFormatter: (tooltipData: TooltipValue) =>
        moment(tooltipData.value).format(dateFormat || 'Y-MM-DD HH:mm:ss.SSS'),
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
    <div style={{ height: 400, width: '100%' }}>
      <Chart className="log-entry-rate-chart">
        <Axis
          id={getAxisId('timestamp')}
          title={i18n.translate('xpack.infra.logs.analysis.logRateSectionXaxisTitle', {
            defaultMessage: 'Time',
          })}
          position="bottom"
          showOverlappingTicks
          tickFormat={chartDateFormatter}
        />
        <Axis
          id={getAxisId('values')}
          title={i18n.translate('xpack.infra.logs.analysis.logRateSectionYaxisTitle', {
            defaultMessage: 'Log entries per 15 minutes',
          })}
          position="left"
          tickFormat={value => Number(value).toFixed(0)}
        />
        <BarSeries
          id={logEntryRateSpecId}
          name={i18n.translate('xpack.infra.logs.analysis.logRateSectionLineSeriesName', {
            defaultMessage: 'Log entries per 15 minutes (avg)',
          })}
          xScaleType="time"
          yScaleType="linear"
          xAccessor={'time'}
          yAccessors={['value']}
          splitSeriesAccessors={['group']}
          stackAccessors={['time']}
          data={logEntryRateSeries}
        />
        <RectAnnotation
          dataValues={logEntryRateAnomalyAnnotations}
          annotationId={logEntryRateAnomalyAnnotationsId}
        />
        <Settings
          onBrushEnd={handleBrushEnd}
          tooltip={tooltipProps}
          theme={isDarkMode ? DARK_THEME : LIGHT_THEME}
          xDomain={{ min: timeRange.startTime, max: timeRange.endTime }}
        />
      </Chart>
    </div>
  );
};
