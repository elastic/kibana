/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback } from 'react';
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
  SpecId,
  TooltipValue,
} from '@elastic/charts';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiSpacer,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../common/http_api/log_analysis/results/log_entry_rate';
import { useLogEntryRateGraphData } from '../../../../containers/logs/log_analysis/log_analysis_graph_data/log_entry_rate';
import { useKibanaUiSetting } from '../../../../utils/use_kibana_ui_setting';

const getColorsMap = (color: string, specId: SpecId) => {
  const map = new Map();
  map.set({ colorValues: [], specId }, color);
  return map;
};

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

  const { areaSeries, lineSeries } = useLogEntryRateGraphData({
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
  const [dateFormat] = useKibanaUiSetting('dateFormat');

  const tooltipProps = {
    headerFormatter: useCallback(
      (data: TooltipValue) => moment.utc(data.value).format(dateFormat || 'Y-MM-DD HH:mm:ss.SSS'),
      [dateFormat]
    ),
  };

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
        <div style={{ height: 400, width: '100%' }}>
          <Chart className="log-entry-rate-chart">
            <Axis
              id={getAxisId('timestamp')}
              title="Time"
              position="bottom"
              showOverlappingTicks
              tickFormat={dateFormatter}
            />
            <Axis
              id={getAxisId('values')}
              title="Log entries"
              position="left"
              tickFormat={value => Number(value).toFixed(0)}
            />
            <AreaSeries
              id={areaSpecId}
              name="Expected"
              xScaleType="time"
              yScaleType="linear"
              xAccessor="x"
              yAccessors={['max']}
              y0Accessors={['min']}
              data={areaSeries}
              yScaleToDataExtent
              curve={2}
              areaSeriesStyle={{
                line: { stroke: 'rgb(224, 237, 255)' },
                area: { fill: 'rgb(224, 237, 255)', visible: true, opacity: 0.8 },
              }}
              customSeriesColors={getColorsMap('rgb(224, 237, 255)', areaSpecId)}
            />
            <LineSeries
              id={lineSpecId}
              name="Log entries (avg)"
              xScaleType="time"
              yScaleType="linear"
              xAccessor={0}
              yAccessors={[1]}
              data={lineSeries}
              yScaleToDataExtent
              curve={2}
              lineSeriesStyle={{
                line: { stroke: 'rgb(49, 133, 252)' },
                point: { radius: 2, fill: 'rgb(49, 133, 252)' },
              }}
              customSeriesColors={getColorsMap('rgb(49, 133, 252)', lineSpecId)}
            />
            <Settings tooltip={tooltipProps} />
          </Chart>
        </div>
      )}
    </>
  );
};
