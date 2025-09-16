/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiI18nNumber,
  EuiLoadingChart,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import {
  BarSeries,
  Chart,
  ScaleType,
  Settings,
  niceTimeFormatter,
  Tooltip,
  TooltipStickTo,
} from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { esqlResultToTimeseries } from '../../util/esql_result_to_timeseries';
import { useTimefilter } from '../../hooks/use_timefilter';
import { TooltipOrPopoverIcon } from '../tooltip_popover_icon/tooltip_popover_icon';
import { getFormattedError } from '../../util/errors';

export function DocumentsColumn({
  indexPattern,
  numDataPoints,
}: {
  indexPattern: string;
  numDataPoints: number;
}) {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;
  const chartBaseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();

  const { timeState } = useTimefilter();

  const minInterval = Math.floor((timeState.end - timeState.start) / numDataPoints);

  const histogramQueryFetch = useStreamsAppFetch(
    async ({ signal, timeState: { start, end } }) => {
      return streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_doc_count_for_stream',
            query: `FROM ${indexPattern} | STATS doc_count = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${minInterval} ms)`,
            start,
            end,
          },
        },
        signal,
      });
    },
    [streamsRepositoryClient, indexPattern, minInterval],
    {
      withTimeRange: true,
      disableToastOnError: true,
    }
  );

  const allTimeseries = React.useMemo(
    () =>
      esqlResultToTimeseries({
        result: histogramQueryFetch,
        metricNames: ['doc_count'],
      }),
    [histogramQueryFetch]
  );

  const docCount = React.useMemo(
    () =>
      allTimeseries.reduce(
        (acc, series) => acc + series.data.reduce((acc2, item) => acc2 + (item.doc_count || 0), 0),
        0
      ),
    [allTimeseries]
  );

  const hasData = docCount > 0;

  const xFormatter = niceTimeFormatter([timeState.start, timeState.end]);

  const noDocCountData = histogramQueryFetch.error ? '' : '-';

  const noHistogramData = histogramQueryFetch.error ? (
    <TooltipOrPopoverIcon
      dataTestSubj="streamsDocCount-error"
      icon="warning"
      title={getFormattedError(histogramQueryFetch.error).message}
      mode="popover"
      iconColor="danger"
    />
  ) : (
    <EuiIcon type="visLine" size="m" />
  );

  const cellAriaLabel = hasData
    ? i18n.translate('xpack.streams.documentsColumn.cellDocCountLabel', {
        defaultMessage: '{docCount} documents in {indexPattern}',
        values: { docCount, indexPattern },
      })
    : i18n.translate('xpack.streams.documentsColumn.cellNoDataLabel', {
        defaultMessage: 'No documents found in {indexPattern}',
        values: { indexPattern },
      });

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      className={css`
        height: ${euiTheme.size.xl};
        white-space: nowrap;
      `}
      role="group"
      aria-label={cellAriaLabel}
    >
      {histogramQueryFetch.loading ? (
        <LoadingPlaceholder />
      ) : (
        <>
          <EuiFlexItem
            grow={2}
            aria-hidden="true"
            className={css`
              text-align: right;
              font-family: 'Roboto mono', sans-serif;
            `}
          >
            {hasData ? <EuiI18nNumber value={docCount} /> : noDocCountData}
          </EuiFlexItem>
          <EuiFlexItem
            grow={3}
            aria-hidden="true"
            className={css`
              border-bottom: ${hasData ? '1px solid' : 'none'} ${euiTheme.colors.lightShade};
              display: flex;
              justify-content: center;
              align-items: center;
            `}
          >
            {hasData ? (
              <Chart size={{ width: '100%', height: euiTheme.size.l }}>
                <Settings
                  locale={i18n.getLocale()}
                  baseTheme={chartBaseTheme}
                  theme={{ background: { color: 'transparent' } }}
                  xDomain={{ min: timeState.start, max: timeState.end, minInterval }}
                  noResults={<div />}
                />
                <Tooltip
                  stickTo={TooltipStickTo.Middle}
                  headerFormatter={({ value }) => xFormatter(value)}
                />
                {allTimeseries.map((serie) => (
                  <BarSeries
                    key={serie.id}
                    id={serie.id}
                    xScaleType={ScaleType.Time}
                    yScaleType={ScaleType.Linear}
                    xAccessor="x"
                    yAccessors={['doc_count']}
                    data={serie.data}
                  />
                ))}
              </Chart>
            ) : (
              noHistogramData
            )}
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
}

const LoadingPlaceholder = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="flexEnd"
      gutterSize="m"
      className={css`
        height: ${euiTheme.size.xl};
        white-space: nowrap;
        padding-right: ${euiTheme.size.xl};
      `}
    >
      <EuiFlexGroup>
        <EuiFlexItem
          className={css`
            text-align: center;
          `}
        >
          -
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          className={css`
            display: flex;
            padding-right: ${euiTheme.size.xl};
            justify-content: center;
          `}
        >
          <EuiLoadingChart size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
