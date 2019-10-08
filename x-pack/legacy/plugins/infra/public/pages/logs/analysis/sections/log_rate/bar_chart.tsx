/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';

import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { useKibanaUiSetting } from '../../../../../utils/use_kibana_ui_setting';

export const LogEntryRateBarChart: React.FunctionComponent<{
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
  series: Array<{ group: string; time: number; value: number }>;
}> = ({ series, setTimeRange, timeRange }) => {
  const [dateFormat] = useKibanaUiSetting('dateFormat');
  const [isDarkMode] = useKibanaUiSetting('theme:darkMode');

  const chartDateFormatter = useMemo(
    () => niceTimeFormatter([timeRange.startTime, timeRange.endTime]),
    [timeRange]
  );

  const logEntryRateSpecId = getSpecId('averageValues');

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
    <div style={{ height: 200, width: '100%' }}>
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
          data={series}
        />
        <Settings
          onBrushEnd={handleBrushEnd}
          tooltip={tooltipProps}
          theme={isDarkMode ? DARK_THEME : LIGHT_THEME}
          xDomain={{ min: timeRange.startTime, max: timeRange.endTime }}
          showLegend
          legendPosition="right"
        />
      </Chart>
    </div>
  );
};
