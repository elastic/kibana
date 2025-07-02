/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import {
  AreaSeries,
  Axis,
  BarSeries,
  Chart,
  CurveType,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  niceTimeFormatter,
  DomainRange,
} from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { AbortableAsyncState } from '@kbn/react-hooks';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import { IUiSettingsClient } from '@kbn/core/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { esqlResultToTimeseries } from '../../util/esql_result_to_timeseries';
import { useKibana } from '../../hooks/use_kibana';
import { LoadingPanel } from '../loading_panel';

function getTimeZone(uiSettings?: IUiSettingsClient) {
  const kibanaTimeZone = uiSettings?.get<'Browser' | string>(UI_SETTINGS.DATEFORMAT_TZ);
  if (!kibanaTimeZone || kibanaTimeZone === 'Browser') {
    return 'local';
  }

  return kibanaTimeZone;
}

const END_ZONE_LABEL = i18n.translate('xpack.streams.esqlChart.endzone', {
  defaultMessage:
    'The selected time range does not include this entire bucket. It might contain partial data.',
});

function getChartType(type: 'area' | 'bar' | 'line') {
  switch (type) {
    case 'area':
      return AreaSeries;
    case 'bar':
      return BarSeries;
    default:
      return LineSeries;
  }
}

export function ControlledEsqlChart<T extends string>({
  id,
  result,
  metricNames,
  chartType = 'line',
  height,
  xDomain: customXDomain,
}: {
  id: string;
  result: AbortableAsyncState<UnparsedEsqlResponse>;
  metricNames: T[];
  chartType?: 'area' | 'bar' | 'line';
  height?: number;
  xDomain?: DomainRange;
}) {
  const {
    core: { uiSettings },
  } = useKibana();
  const chartBaseTheme = useElasticChartsTheme();

  const allTimeseries = useMemo(
    () =>
      esqlResultToTimeseries<T>({
        result,
        metricNames,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result, ...metricNames]
  );

  const effectiveHeight = height ? `${height}px` : '100%';

  if (result.loading && !result.value?.values.length) {
    return (
      <LoadingPanel
        loading
        className={css`
          height: ${effectiveHeight};
        `}
      />
    );
  }

  const xValues = allTimeseries.flatMap(({ data }) => data.map(({ x }) => x));

  // todo - pull in time range here
  const min = customXDomain?.min ?? Math.min(...xValues);
  const max = customXDomain?.max ?? Math.max(...xValues);

  const isEmpty = min === 0 && max === 0;

  const xFormatter = niceTimeFormatter([min, max]);

  const xDomain: DomainRange = isEmpty
    ? { min: 0, max: 1 }
    : { min, max, minInterval: customXDomain?.minInterval };

  const yTickFormat = (value: number | null) => (value === null ? '' : String(value));
  const yLabelFormat = (label: string) => label;

  const timeZone = getTimeZone(uiSettings);

  return (
    <Chart
      id={id}
      className={css`
        height: ${effectiveHeight};
      `}
    >
      <Tooltip
        stickTo="top"
        showNullValues={false}
        headerFormatter={({ value }) => {
          const formattedValue = xFormatter(value);
          if (max === value) {
            return (
              <>
                <EuiFlexGroup
                  alignItems="center"
                  responsive={false}
                  gutterSize="xs"
                  style={{ fontWeight: 'normal' }}
                >
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="info" />
                  </EuiFlexItem>
                  <EuiFlexItem>{END_ZONE_LABEL}</EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
                {formattedValue}
              </>
            );
          }
          return formattedValue;
        }}
      />
      <Settings
        showLegend={false}
        legendPosition={Position.Bottom}
        xDomain={xDomain}
        locale={i18n.getLocale()}
        baseTheme={chartBaseTheme}
      />
      <Axis
        id="x-axis"
        position={Position.Bottom}
        showOverlappingTicks
        tickFormat={xFormatter}
        gridLine={{ visible: false }}
      />
      <Axis
        id="y-axis"
        ticks={3}
        position={Position.Left}
        hide
        tickFormat={yTickFormat}
        labelFormat={yLabelFormat}
      />
      {allTimeseries.map((serie) => {
        const Series = getChartType(chartType);

        return (
          <Series
            timeZone={timeZone}
            key={serie.id}
            color="#61A2FF"
            id={serie.id}
            // Defaults to multi layer time axis as of Elastic Charts v70
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={serie.metricNames}
            data={serie.data}
            curve={CurveType.CURVE_MONOTONE_X}
          />
        );
      })}
    </Chart>
  );
}
