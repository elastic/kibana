/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { first, last } from 'lodash';
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
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiCheckbox,
} from '@elastic/eui';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../common/http_api/log_analysis/results/log_entry_rate';
import { useLogEntryRateGraphData } from '../../../../containers/logs/log_analysis/log_analysis_graph_data/log_entry_rate';
import { useKibanaUiSetting } from '../../../../utils/use_kibana_ui_setting';
import { getColorsMap, isDarkMode, getChartTheme } from '../chart_helpers';

const areaSeriesColour = 'rgb(224, 237, 255)';
const lineSeriesColour = 'rgb(49, 133, 252)';

export const LogRateResults = ({
  isLoading,
  results,
}: {
  isLoading: boolean;
  results: GetLogEntryRateSuccessResponsePayload['data'] | null;
}) => {
  const title = i18n.translate('xpack.infra.logs.analysis.logRateSectionTitle', {
    defaultMessage: 'Log entries',
  });

  const loadingAriaLabel = i18n.translate(
    'xpack.infra.logs.analysis.logRateSectionLoadingAriaLabel',
    { defaultMessage: 'Loading log rate results' }
  );
  const showModelBoundsLabel = i18n.translate(
    'xpack.infra.logs.analysis.logRateSectionModelBoundsCheckboxLabel',
    { defaultMessage: 'Show model bounds' }
  );

  const { areaSeries, lineSeries, anomalySeries } = useLogEntryRateGraphData({
    data: results,
  });

  const dateFormatter = useMemo(
    () =>
      lineSeries.length > 0
        ? niceTimeFormatter([first(lineSeries)[0], last(lineSeries)[0]])
        : (value: number) => `${value}`,
    [lineSeries]
  );

  const areaSpecId = getSpecId('modelBounds');
  const lineSpecId = getSpecId('averageValues');
  const anomalySpecId = getSpecId('anomalies');

  const [dateFormat] = useKibanaUiSetting('dateFormat');

  const tooltipProps = {
    headerFormatter: useCallback(
      (data: TooltipValue) => moment.utc(data.value).format(dateFormat || 'Y-MM-DD HH:mm:ss.SSS'),
      [dateFormat]
    ),
  };

  const [isShowingModelBounds, setIsShowingModelBounds] = useState<boolean>(true);

  return (
    <>
      <EuiTitle size="m" aria-label={title}>
        <h2>{title}</h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      {isLoading ? (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="xl" aria-label={loadingAriaLabel} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : !results || (results && results.histogramBuckets && !results.histogramBuckets.length) ? (
        <EuiEmptyPrompt
          title={
            <h2>
              {i18n.translate('xpack.infra.logs.analysis.logRateSectionNoDataTitle', {
                defaultMessage: 'There is no data to display.',
              })}
            </h2>
          }
          titleSize="m"
          body={
            <p>
              {i18n.translate('xpack.infra.logs.analysis.logRateSectionNoDataBody', {
                defaultMessage: 'Try adjusting your time range',
              })}
            </p>
          }
        />
      ) : (
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
                  defaultMessage: 'Log entries',
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
                  defaultMessage: 'Log entries (avg)',
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
              <Settings tooltip={tooltipProps} theme={getChartTheme()} />
            </Chart>
          </div>
        </>
      )}
    </>
  );
};
