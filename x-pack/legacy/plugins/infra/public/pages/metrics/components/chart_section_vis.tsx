/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useMemo } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import {
  Axis,
  Chart,
  getAxisId,
  niceTimeFormatter,
  Position,
  Settings,
  TooltipValue,
} from '@elastic/charts';
import { EuiPageContentBody } from '@elastic/eui';
import { getChartTheme } from '../../../components/metrics_explorer/helpers/get_chart_theme';
import { SeriesChart } from './series_chart';
import {
  getFormatter,
  getMaxMinTimestamp,
  getChartName,
  getChartColor,
  getChartType,
  seriesHasLessThen2DataPoints,
} from './helpers';
import { ErrorMessage } from './error_message';
import { useKibanaUiSetting } from '../../../utils/use_kibana_ui_setting';
import { useUiSetting } from '../../../../../../../../src/plugins/kibana_react/public';
import { VisSectionProps } from '../types';

export const ChartSectionVis = ({
  id,
  onChangeRangeTime,
  metric,
  stopLiveStreaming,
  isLiveStreaming,
  formatter,
  formatterTemplate,
  stacked,
  seriesOverrides,
  type,
}: VisSectionProps) => {
  const isDarkMode = useUiSetting<boolean>('theme:darkMode');
  const [dateFormat] = useKibanaUiSetting('dateFormat');
  const valueFormatter = useCallback(getFormatter(formatter, formatterTemplate), [
    formatter,
    formatterTemplate,
  ]);
  const dateFormatter = useMemo(
    () => (metric != null ? niceTimeFormatter(getMaxMinTimestamp(metric)) : undefined),
    [metric]
  );
  const handleTimeChange = useCallback(
    (from: number, to: number) => {
      if (onChangeRangeTime) {
        if (isLiveStreaming && stopLiveStreaming) {
          stopLiveStreaming();
        }
        onChangeRangeTime({
          from: moment(from).toISOString(),
          to: moment(to).toISOString(),
          interval: '>=1m',
        });
      }
    },
    [onChangeRangeTime, isLiveStreaming, stopLiveStreaming]
  );
  const tooltipProps = {
    headerFormatter: useCallback(
      (data: TooltipValue) => moment(data.value).format(dateFormat || 'Y-MM-DD HH:mm:ss.SSS'),
      [dateFormat]
    ),
  };

  if (!id) {
    return null;
  } else if (!metric) {
    return (
      <ErrorMessage
        title={i18n.translate('xpack.infra.chartSection.missingMetricDataText', {
          defaultMessage: 'Missing Data',
        })}
        body={i18n.translate('xpack.infra.chartSection.missingMetricDataBody', {
          defaultMessage: 'The data for this chart is missing.',
        })}
      />
    );
  } else if (metric.series.some(seriesHasLessThen2DataPoints)) {
    return (
      <ErrorMessage
        title={i18n.translate('xpack.infra.chartSection.notEnoughDataPointsToRenderTitle', {
          defaultMessage: 'Not Enough Data',
        })}
        body={i18n.translate('xpack.infra.chartSection.notEnoughDataPointsToRenderText', {
          defaultMessage: 'Not enough data points to render chart, try increasing the time range.',
        })}
      />
    );
  }

  return (
    <EuiPageContentBody>
      <div className="infrastructureChart" style={{ height: 250, marginBottom: 16 }}>
        <Chart>
          <Axis
            id={getAxisId('timestamp')}
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={dateFormatter}
          />
          <Axis id={getAxisId('values')} position={Position.Left} tickFormat={valueFormatter} />
          {metric &&
            metric.series.map(series => (
              <SeriesChart
                key={`series-${id}-${series.id}`}
                id={`series-${id}-${series.id}`}
                series={series}
                name={getChartName(seriesOverrides, series.id, series.id)}
                type={getChartType(seriesOverrides, type, series.id)}
                color={getChartColor(seriesOverrides, series.id)}
                stack={stacked}
              />
            ))}
          <Settings
            tooltip={tooltipProps}
            onBrushEnd={handleTimeChange}
            theme={getChartTheme(isDarkMode)}
            showLegend={true}
            legendPosition="right"
          />
        </Chart>
      </div>
    </EuiPageContentBody>
  );
};
