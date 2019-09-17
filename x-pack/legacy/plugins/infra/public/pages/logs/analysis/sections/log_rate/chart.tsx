/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import {
  Axis,
  Chart,
  getAxisId,
  getSpecId,
  AreaSeries,
  LineSeries,
  niceTimeFormatter,
  Settings,
  TooltipValue,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiCheckbox } from '@elastic/eui';
import { getColorsMap, isDarkMode, getChartTheme } from '../../chart_helpers';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../../common/http_api/log_analysis/results/log_entry_rate';
import { useLogEntryRateGraphData } from '../../../../../containers/logs/log_analysis/log_analysis_graph_data/log_entry_rate';
import { useKibanaUiSetting } from '../../../../../utils/use_kibana_ui_setting';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';

const areaSeriesColour = 'rgb(224, 237, 255)';
const lineSeriesColour = 'rgb(49, 133, 252)';

interface Props {
  data: GetLogEntryRateSuccessResponsePayload['data'] | null;
  timeRange: TimeRange;
}

export const ChartView = ({ data, timeRange }: Props) => {
  const showModelBoundsLabel = i18n.translate(
    'xpack.infra.logs.analysis.logRateSectionModelBoundsCheckboxLabel',
    { defaultMessage: 'Show model bounds' }
  );

  const { areaSeries, lineSeries, anomalySeries } = useLogEntryRateGraphData({ data });

  const dateFormatter = useMemo(
    () =>
      lineSeries.length > 0
        ? niceTimeFormatter([timeRange.startTime, timeRange.endTime])
        : (value: number) => `${value}`,
    [lineSeries, timeRange]
  );

  const areaSpecId = getSpecId('modelBounds');
  const lineSpecId = getSpecId('averageValues');
  const anomalySpecId = getSpecId('anomalies');

  const [dateFormat] = useKibanaUiSetting('dateFormat');

  const tooltipProps = useMemo(
    () => ({
      headerFormatter: (tooltipData: TooltipValue) =>
        moment(tooltipData.value).format(dateFormat || 'Y-MM-DD HH:mm:ss.SSS'),
    }),
    [dateFormat]
  );

  const [isShowingModelBounds, setIsShowingModelBounds] = useState<boolean>(true);
  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={'showModelBoundsCheckbox'}
            label={showModelBoundsLabel}
            aria-label={showModelBoundsLabel}
            checked={isShowingModelBounds}
            onChange={e => {
              setIsShowingModelBounds(e.target.checked);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <div style={{ height: 400, width: '100%' }}>
        <Chart className="log-entry-rate-chart">
          <Axis
            id={getAxisId('timestamp')}
            title={i18n.translate('xpack.infra.logs.analysis.logRateSectionXaxisTitle', {
              defaultMessage: 'Time',
            })}
            position="bottom"
            showOverlappingTicks
            tickFormat={dateFormatter}
          />
          <Axis
            id={getAxisId('values')}
            title={i18n.translate('xpack.infra.logs.analysis.logRateSectionYaxisTitle', {
              defaultMessage: 'Log entries per 15 minutes',
            })}
            position="left"
            tickFormat={value => Number(value).toFixed(0)}
          />
          {isShowingModelBounds ? (
            <AreaSeries
              id={areaSpecId}
              name={i18n.translate('xpack.infra.logs.analysis.logRateSectionAreaSeriesName', {
                defaultMessage: 'Expected',
              })}
              xScaleType="time"
              yScaleType="linear"
              xAccessor="x"
              yAccessors={['max']}
              y0Accessors={['min']}
              data={areaSeries}
              yScaleToDataExtent
              curve={2}
              areaSeriesStyle={
                !isDarkMode()
                  ? {
                      line: { stroke: areaSeriesColour },
                      area: { fill: areaSeriesColour, visible: true, opacity: 0.8 },
                    }
                  : undefined
              }
              customSeriesColors={
                !isDarkMode() ? getColorsMap(areaSeriesColour, areaSpecId) : undefined
              }
            />
          ) : null}
          <LineSeries
            id={lineSpecId}
            name={i18n.translate('xpack.infra.logs.analysis.logRateSectionLineSeriesName', {
              defaultMessage: 'Log entries per 15 minutes (avg)',
            })}
            xScaleType="time"
            yScaleType="linear"
            xAccessor={0}
            yAccessors={[1]}
            data={lineSeries}
            yScaleToDataExtent
            curve={2}
            lineSeriesStyle={
              !isDarkMode()
                ? {
                    line: { stroke: lineSeriesColour },
                    point: { radius: 2, fill: lineSeriesColour },
                  }
                : undefined
            }
            customSeriesColors={
              !isDarkMode() ? getColorsMap(lineSeriesColour, lineSpecId) : undefined
            }
          />
          <LineSeries
            id={anomalySpecId}
            name={i18n.translate('xpack.infra.logs.analysis.logRateSectionAnomalySeriesName', {
              defaultMessage: 'Anomalies',
            })}
            xScaleType="time"
            yScaleType="linear"
            xAccessor={0}
            yAccessors={[1]}
            data={anomalySeries}
            yScaleToDataExtent
            curve={2}
            lineSeriesStyle={
              !isDarkMode()
                ? {
                    line: { stroke: 'red', opacity: 0 },
                    point: { radius: 3, fill: 'red' },
                  }
                : undefined
            }
            customSeriesColors={!isDarkMode() ? getColorsMap('red', anomalySpecId) : undefined}
          />
          <Settings
            tooltip={tooltipProps}
            theme={getChartTheme()}
            xDomain={{ min: timeRange.startTime, max: timeRange.endTime }}
          />
        </Chart>
      </div>
    </>
  );
};
