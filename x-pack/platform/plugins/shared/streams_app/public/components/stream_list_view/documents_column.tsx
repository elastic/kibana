/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiI18nNumber, EuiSkeletonRectangle } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
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
    [streamsRepositoryClient, indexPattern, , minInterval],
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

  const docCount = allTimeseries.reduce(
    (acc, series) => acc + series.data.reduce((acc2, item) => acc2 + (item.doc_count || 0), 0),
    0
  );

  const xFormatter = niceTimeFormatter([timeState.start, timeState.end]);

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      className={css`
        height: ${euiThemeVars.euiSizeXL};
        white-space: nowrap;
      `}
    >
      {histogramQueryFetch.loading ? (
        <>
          <EuiFlexItem>
            <EuiSkeletonRectangle isLoading width="100%" height={euiThemeVars.euiSizeL} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSkeletonRectangle isLoading width="100%" height={euiThemeVars.euiSizeL} />
          </EuiFlexItem>
        </>
      ) : (
        <>
          <EuiFlexItem
            className={css`
              text-align: right;
            `}
          >
            <EuiI18nNumber value={docCount} />
          </EuiFlexItem>
          <EuiFlexItem
            className={css`
              border-bottom: 1px solid ${euiThemeVars.euiColorLightestShade};
            `}
          >
            <Chart size={{ width: '100%', height: euiThemeVars.euiSizeL }}>
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
                  // Defaults to multi layer time axis as of Elastic Charts v70
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor="x"
                  yAccessors={['doc_count']}
                  data={serie.data}
                />
              ))}
            </Chart>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
}
