/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import {
  Axis,
  BarSeries,
  Chart,
  ScaleType,
  Settings,
  LIGHT_THEME,
  DARK_THEME,
} from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AbortableAsyncState } from '@kbn/react-hooks';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import { IUiSettingsClient } from '@kbn/core/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { calculateAuto } from '@kbn/calculate-auto';
import moment from 'moment';
import { esqlResultToTimeseries } from '../../util/esql_result_to_timeseries';
import { LoadingPanel } from '../loading_panel';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';

function getTimeZone(uiSettings?: IUiSettingsClient) {
  const kibanaTimeZone = uiSettings?.get<'Browser' | string>(UI_SETTINGS.DATEFORMAT_TZ);
  if (!kibanaTimeZone || kibanaTimeZone === 'Browser') {
    return 'local';
  }

  return kibanaTimeZone;
}

export function ColumnChart() {
  const {
    dependencies: {
      start: {
        data,
        dataViews,
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const {
    absoluteTimeRange: { start, end },
  } = data.query.timefilter.timefilter.useTimefilter();

  const histogramQueryFetch = useStreamsAppFetch(
    async ({ signal }) => {
      // if (!queries?.histogramQuery || !indexPatterns) {
      //   return undefined;
      // }

      // const existingIndices = await dataViews.getExistingIndices(indexPatterns);

      // if (existingIndices.length === 0) {
      //   return undefined;
      // }

      const bucketSize = Math.round(
        calculateAuto.atLeast(50, moment.duration(1, 'minute'))!.asSeconds()
      );

      const histogramQuery = `FROM logs | STATS metric = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${bucketSize} hours)`;

      return streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_histogram_for_stream',
            query: histogramQuery,
            start: 1742222777877,
            end: 1742222777877,
          },
        },
        signal,
      });
    },
    [dataViews, streamsRepositoryClient, start, end]
  );

  return (
    <ControlledEsqlChart
      result={histogramQueryFetch}
      id="entity_log_rate"
      metricNames={['metric']}
      height={32}
    />
  );
}

export function ControlledEsqlChart<T extends string>({
  id,
  result,
  metricNames,
  width,
  height,
}: {
  id: string;
  result: AbortableAsyncState<UnparsedEsqlResponse>;
  metricNames: T[];
  width?: string | number;
  height?: string | number;
}) {
  const {
    core: { uiSettings },
    dependencies: {
      start: { data },
    },
  } = useKibana();
  const { colorMode } = useEuiTheme();

  const {
    absoluteTimeRange: { start, end },
  } = data.query.timefilter.timefilter.useTimefilter();

  const allTimeseries = useMemo(
    () =>
      esqlResultToTimeseries<T>({
        result,
        metricNames,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result, ...metricNames]
  );

  if (result.loading && !result.value?.values.length) {
    return <LoadingPanel loading />;
  }

  const timeZone = getTimeZone(uiSettings);

  return (
    <Chart id={id} size={{ width, height }}>
      <Settings
        xDomain={{ min: start, max: end }}
        locale={i18n.getLocale()}
        baseTheme={colorMode === 'LIGHT' ? LIGHT_THEME : DARK_THEME}
        theme={{ background: { color: 'transparent' } }}
      />
      <Axis id="x-axis" hide ticks={0} gridLine={{ visible: false }} />
      <Axis id="y-axis" hide ticks={0} gridLine={{ visible: false }} />
      {allTimeseries.map((serie) => (
        <BarSeries
          timeZone={timeZone}
          key={serie.id}
          id={serie.id}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={serie.metricNames}
          data={serie.data}
        />
      ))}
    </Chart>
  );
}
