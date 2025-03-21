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
  EuiSkeletonText,
  EuiSkeletonRectangle,
  EuiDelayRender,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/css';
import moment from 'moment';
import {
  BarSeries,
  Chart,
  ScaleType,
  Settings,
  LIGHT_THEME,
  DARK_THEME,
  type SettingsProps,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';
import { esqlResultToTimeseries } from '../../util/esql_result_to_timeseries';

export function DocCountColumn({
  indexPattern,
  start,
  end,
  numDataPoints,
}: {
  indexPattern: string;
  start: number;
  end: number;
  numDataPoints: number;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const histogramQueryFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const bucketSize = Math.round(moment.duration((end - start) / numDataPoints).asSeconds());
      return streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_doc_count_for_stream',
            query: `FROM ${indexPattern} | STATS doc_count = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${bucketSize} seconds)`,
            start,
            end,
          },
        },
        signal,
      });
    },
    [streamsRepositoryClient, indexPattern, start, end, numDataPoints]
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

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      className={css`
        height: ${euiThemeVars.euiSizeXL};
        margin-right: ${euiThemeVars.euiSizeXL};
        white-space: nowrap;
      `}
    >
      <EuiFlexItem
        className={css`
          text-align: right;
        `}
      >
        {histogramQueryFetch.loading ? (
          <EuiDelayRender delay={300}>
            <EuiSkeletonText isLoading lines={1} size="relative" />
          </EuiDelayRender>
        ) : (
          <EuiI18nNumber value={docCount} />
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        {histogramQueryFetch.loading ? (
          <EuiDelayRender delay={300}>
            <EuiSkeletonRectangle isLoading width="100%" height={euiThemeVars.euiSizeXL} />
          </EuiDelayRender>
        ) : (
          <Chart size={{ width: '100%', height: euiThemeVars.euiSizeXL }}>
            <SettingsWithTheme xDomain={{ min: start, max: end }} noResults={<div />} />
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
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function SettingsWithTheme(props: SettingsProps) {
  const { colorMode } = useEuiTheme();
  return (
    <Settings
      locale={i18n.getLocale()}
      baseTheme={colorMode === 'LIGHT' ? LIGHT_THEME : DARK_THEME}
      theme={{ background: { color: 'transparent' } }}
      {...props}
    />
  );
}
