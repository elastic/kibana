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

export function DocumentsColumn({
  indexPattern,
  numDataPoints,
}: {
  indexPattern: string;
  numDataPoints: number;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const chartBaseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();

  const LoadingPlaceholder: React.FC = React.useCallback(
    () => (
      <EuiFlexGroup
        alignItems="center"
        justifyContent="flexEnd"
        gutterSize="m"
        className={css`
          height: ${euiTheme.size.xl};
          white-space: nowrap;
          padding-right: ${euiTheme.size.xl};
        `}
        role="status"
        aria-live="polite"
        aria-label={i18n.translate('xpack.streams.documentsColumn.loadingAriaLabel', {
          defaultMessage: 'Loading document count and chart data for {indexPattern}',
          values: { indexPattern },
        })}
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
    ),
    [euiTheme, indexPattern]
  );

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

  const chartDescription = React.useMemo(() => {
    if (!hasData) {
      return i18n.translate('xpack.streams.documentsColumn.noDataDescription', {
        defaultMessage: 'No document data available for {indexPattern}',
        values: { indexPattern },
      });
    }

    const timeRange = i18n.translate('xpack.streams.documentsColumn.timeRangeDescription', {
      defaultMessage: 'from {start} to {end}',
      values: {
        start: xFormatter(timeState.start),
        end: xFormatter(timeState.end),
      },
    });

    return i18n.translate('xpack.streams.documentsColumn.chartDescription', {
      defaultMessage:
        'Document count chart for {indexPattern} showing {docCount} total documents {timeRange}',
      values: { indexPattern, docCount, timeRange },
    });
  }, [hasData, indexPattern, docCount, xFormatter, timeState.start, timeState.end]);

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      className={css`
        height: ${euiTheme.size.xl};
        white-space: nowrap;
      `}
      tabIndex={0}
      aria-label={i18n.translate('xpack.streams.documentsColumn.cellAriaLabel', {
        defaultMessage: 'Documents column for {indexPattern}',
        values: { indexPattern },
      })}
    >
      {histogramQueryFetch.loading ? (
        <LoadingPlaceholder />
      ) : (
        <>
          <EuiFlexItem
            grow={2}
            className={css`
              text-align: right;
            `}
          >
            {hasData ? (
              <span
                aria-label={i18n.translate('xpack.streams.documentsColumn.documentCountAriaLabel', {
                  defaultMessage: '{docCount} documents in {indexPattern}',
                  values: { docCount, indexPattern },
                })}
              >
                <EuiI18nNumber value={docCount} />
              </span>
            ) : (
              <span
                aria-label={i18n.translate('xpack.streams.documentsColumn.noDataAriaLabel', {
                  defaultMessage: 'No document data available for {indexPattern}',
                  values: { indexPattern },
                })}
              >
                {i18n.translate('xpack.streams.documentsColumn.noDataLabel', {
                  defaultMessage: 'N/A',
                })}
              </span>
            )}
          </EuiFlexItem>
          <EuiFlexItem
            grow={3}
            className={css`
              border-bottom: ${hasData ? '1px solid' : 'none'} ${euiTheme.colors.lightShade};
              display: flex;
              justify-content: center;
              align-items: center;
            `}
          >
            {hasData ? (
              <div
                role="img"
                aria-label={chartDescription}
                tabIndex={0}
                className={css`
                  width: 100%;
                  &:focus {
                    outline: 2px solid ${euiTheme.colors.primary};
                    outline-offset: 2px;
                  }
                `}
              >
                <Chart size={{ width: '100%', height: euiTheme.size.l }}>
                  <Settings
                    locale={i18n.getLocale()}
                    baseTheme={chartBaseTheme}
                    theme={{ background: { color: 'transparent' } }}
                    xDomain={{ min: timeState.start, max: timeState.end, minInterval }}
                    noResults={<div />}
                    ariaLabel={chartDescription}
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
              </div>
            ) : (
              <EuiIcon
                type="visLine"
                size="m"
                aria-label={i18n.translate('xpack.streams.documentsColumn.noDataIconAriaLabel', {
                  defaultMessage: 'No chart data available',
                })}
              />
            )}
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
}
