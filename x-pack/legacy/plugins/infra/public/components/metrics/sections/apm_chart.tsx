/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  Axis,
  Chart,
  getAxisId,
  niceTimeFormatter,
  Position,
  Settings,
  TooltipValue,
} from '@elastic/charts';
import moment from 'moment';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibanaUiSetting } from '../../../utils/use_kibana_ui_setting';
import { getChartTheme } from '../../metrics_explorer/helpers/get_chart_theme';
import { SeriesChart } from './series_chart';
import {
  getFormatter,
  getTimestampDomainFromSeries,
  getMaxMinTimestamp,
  seriesHasLessThen2DataPoints,
} from './helpers';
import { InfraApmMetricsDataSet } from '../../../../common/http_api';
import { InfraFormatterType } from '../../../lib/lib';
import {
  InfraMetricLayoutSection,
  InfraMetricLayoutVisualizationType,
} from '../../../pages/metrics/layouts/types';
import { ErrorMessage } from './error_message';
import { InfraTimerangeInput } from '../../../graphql/types';

interface Props {
  section: InfraMetricLayoutSection;
  dataSet?: InfraApmMetricsDataSet | undefined;
  formatterTemplate?: string;
  transformDataPoint?: (value: number) => number;
  onChangeRangeTime?: (time: InfraTimerangeInput) => void;
  isLiveStreaming?: boolean;
  stopLiveStreaming?: () => void;
}

export const ApmChart = ({
  dataSet,
  section,
  formatterTemplate,
  transformDataPoint = noopTransformer,
  onChangeRangeTime,
  isLiveStreaming,
  stopLiveStreaming,
}: Props) => {
  if (!dataSet) {
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
  }
  if (dataSet.series.some(seriesHasLessThen2DataPoints)) {
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

  const [dateFormat] = useKibanaUiSetting('dateFormat');
  const tooltipProps = {
    headerFormatter: useCallback(
      (data: TooltipValue) => moment(data.value).format(dateFormat || 'Y-MM-DD HH:mm:ss.SSS'),
      [dateFormat]
    ),
  };
  const valueFormatter = getFormatter(InfraFormatterType.number, formatterTemplate || '{{value}}');
  const valueFormatterWithTransorm = useCallback(
    (value: number) => valueFormatter(transformDataPoint(value)),
    [formatterTemplate, transformDataPoint]
  );
  const dateFormatter = useCallback(niceTimeFormatter(getMaxMinTimestamp(dataSet)), [dataSet]);
  const handleTimeChange = useCallback(
    (from: number, to: number) => {
      if (onChangeRangeTime) {
        if (isLiveStreaming && stopLiveStreaming) {
          stopLiveStreaming();
        }
        onChangeRangeTime({
          from,
          to,
          interval: '>=1m',
        });
      }
    },
    [onChangeRangeTime, isLiveStreaming, stopLiveStreaming]
  );
  const [minTimestamp, maxTimestamp] = getMaxMinTimestamp(dataSet);
  const timestampDomain = { min: minTimestamp, max: maxTimestamp };

  return (
    <Chart>
      <Axis
        id={getAxisId('timestamp')}
        position={Position.Bottom}
        showOverlappingTicks={true}
        tickFormat={dateFormatter}
      />
      <Axis
        id={getAxisId('values')}
        position={Position.Left}
        tickFormat={valueFormatterWithTransorm}
      />
      {dataSet &&
        dataSet.series.map(series => (
          <SeriesChart
            key={`series-${section.id}-${series.id}`}
            id={`series-${section.id}-${series.id}`}
            series={series}
            name={series.id}
            type={InfraMetricLayoutVisualizationType.line}
            ignoreGaps={true}
          />
        ))}
      <Settings
        xDomain={timestampDomain}
        tooltip={tooltipProps}
        theme={getChartTheme()}
        onBrushEnd={handleTimeChange}
      />
    </Chart>
  );
};

const noopTransformer = (value: number) => value;
