/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import moment from 'moment';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { get } from 'lodash';
import {
  Axis,
  Chart,
  getAxisId,
  niceTimeFormatter,
  Position,
  Settings,
  TooltipValue,
} from '@elastic/charts';
import { EuiPageContentBody, EuiTitle } from '@elastic/eui';
import { InfraMetricLayoutSection } from '../../../pages/metrics/layouts/types';
import { InfraMetricData } from '../../../graphql/types';
import { getChartTheme } from '../../metrics_explorer/helpers/get_chart_theme';
import { InfraFormatterType } from '../../../lib/lib';
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
import { MetricsTimeInput } from '../../../containers/metrics/with_metrics_time';

interface Props {
  section: InfraMetricLayoutSection;
  metric: InfraMetricData;
  onChangeRangeTime?: (time: MetricsTimeInput) => void;
  isLiveStreaming?: boolean;
  stopLiveStreaming?: () => void;
  intl: InjectedIntl;
}

export const ChartSection = injectI18n(
  ({ onChangeRangeTime, section, metric, intl, stopLiveStreaming, isLiveStreaming }: Props) => {
    const { visConfig } = section;
    const [dateFormat] = useKibanaUiSetting('dateFormat');
    const formatter = get(visConfig, 'formatter', InfraFormatterType.number);
    const formatterTemplate = get(visConfig, 'formatterTemplate', '{{value}}');
    const valueFormatter = useCallback(getFormatter(formatter, formatterTemplate), [
      formatter,
      formatterTemplate,
    ]);
    const dateFormatter = useCallback(niceTimeFormatter(getMaxMinTimestamp(metric)), [metric]);
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

    if (!metric) {
      return (
        <ErrorMessage
          title={intl.formatMessage({
            id: 'xpack.infra.chartSection.missingMetricDataText',
            defaultMessage: 'Missing Data',
          })}
          body={intl.formatMessage({
            id: 'xpack.infra.chartSection.missingMetricDataBody',
            defaultMessage: 'The data for this chart is missing.',
          })}
        />
      );
    }

    if (metric.series.some(seriesHasLessThen2DataPoints)) {
      return (
        <ErrorMessage
          title={intl.formatMessage({
            id: 'xpack.infra.chartSection.notEnoughDataPointsToRenderTitle',
            defaultMessage: 'Not Enough Data',
          })}
          body={intl.formatMessage({
            id: 'xpack.infra.chartSection.notEnoughDataPointsToRenderText',
            defaultMessage:
              'Not enough data points to render chart, try increasing the time range.',
          })}
        />
      );
    }

    return (
      <EuiPageContentBody>
        <EuiTitle size="xs">
          <h3 id={section.id}>{section.label}</h3>
        </EuiTitle>
        <div style={{ height: 250, marginBottom: 16 }}>
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
                  key={`series-${section.id}-${series.id}`}
                  id={`series-${section.id}-${series.id}`}
                  series={series}
                  name={getChartName(section, series.id)}
                  type={getChartType(section, series.id)}
                  color={getChartColor(section, series.id)}
                  stack={visConfig.stacked}
                />
              ))}
            <Settings
              tooltip={tooltipProps}
              onBrushEnd={handleTimeChange}
              theme={getChartTheme()}
              showLegend={true}
              legendPosition="right"
            />
          </Chart>
        </div>
      </EuiPageContentBody>
    );
  }
);
