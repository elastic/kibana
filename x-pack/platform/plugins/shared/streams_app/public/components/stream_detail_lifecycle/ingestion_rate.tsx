/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { getCalculateAutoTimeExpression } from '@kbn/data-plugin/common';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { i18n } from '@kbn/i18n';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import datemath from '@kbn/datemath';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { AreaSeries, Axis, Chart, Settings } from '@elastic/charts';
import { useKibana } from '../../hooks/use_kibana';
import { DataStreamStats } from './hooks/use_data_stream_stats';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { ingestionRateQuery } from './helpers/ingestion_rate_query';
import { formatBytes } from './helpers/format_bytes';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { useDateRange } from '../../hooks/use_date_range';

export function IngestionRate({
  definition,
  stats,
  isLoadingStats,
  refreshStats,
}: {
  definition?: IngestStreamGetResponse;
  stats?: DataStreamStats;
  isLoadingStats: boolean;
  refreshStats: () => void;
}) {
  const {
    core,
    dependencies: {
      start: { data },
    },
  } = useKibana();
  const { timeRange, setTimeRange } = useDateRange({ data });
  const calcAutoInterval = useMemo(
    () => getCalculateAutoTimeExpression((key) => core.uiSettings.get(key)),
    [core.uiSettings]
  );

  const {
    loading: isLoadingIngestionRate,
    value: ingestionRate,
    error: ingestionRateError,
  } = useStreamsAppFetch(
    async ({ signal }) => {
      if (!definition || isLoadingStats || !stats?.bytesPerDay) {
        return;
      }

      const start = datemath.parse(timeRange.from);
      const end = datemath.parse(timeRange.to);
      const interval = calcAutoInterval(timeRange);
      if (!start || !end || !interval) {
        return;
      }

      const { rawResponse } = await lastValueFrom(
        data.search.search<
          IKibanaSearchRequest,
          IKibanaSearchResponse<{
            aggregations: { docs_count: { buckets: Array<{ key: string; doc_count: number }> } };
          }>
        >(
          {
            params: ingestionRateQuery({
              interval,
              start: start.format(),
              end: end.format(),
              index: definition.stream.name,
            }),
          },
          { abortSignal: signal }
        )
      );

      return {
        buckets: rawResponse.aggregations.docs_count.buckets.map(
          ({ key, doc_count: docCount }) => ({
            key,
            value: docCount * stats.bytesPerDoc,
          })
        ),
        start: toLegendFormat(start),
        end: toLegendFormat(end),
        interval,
      };
    },
    [data.search, definition, stats, isLoadingStats, timeRange, calcAutoInterval]
  );

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={3}>
            <EuiText>
              <h5>
                {i18n.translate('xpack.streams.streamDetailLifecycle.ingestionRatePanel', {
                  defaultMessage: 'Ingestion rate',
                })}
              </h5>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <StreamsAppSearchBar
              dateRangeFrom={timeRange.from}
              dateRangeTo={timeRange.to}
              onQuerySubmit={({ dateRange }, isUpdate) => {
                if (!isUpdate) {
                  refreshStats();
                  return;
                }

                if (dateRange) {
                  setTimeRange({
                    from: dateRange.from,
                    to: dateRange?.to,
                    mode: dateRange.mode,
                  });
                }
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer />

      <EuiFlexGroup
        justifyContent="center"
        alignItems="center"
        style={{ width: '100%', minHeight: '250px' }}
        direction="column"
        gutterSize="xs"
      >
        {ingestionRateError ? (
          'Failed to load ingestion rate'
        ) : isLoadingIngestionRate || isLoadingStats || !ingestionRate ? (
          <EuiLoadingChart />
        ) : (
          <>
            <Chart size={{ height: 250 }}>
              <Settings showLegend={false} />
              <AreaSeries
                id="ingestionRate"
                name="Ingestion rate"
                data={ingestionRate.buckets}
                color="#61A2FF"
                xScaleType="time"
                xAccessor={'key'}
                yAccessors={['value']}
              />

              <Axis
                id="bottom-axis"
                position="bottom"
                tickFormat={(value) => moment(value).format('YYYY-MM-DD HH:mm:ss')}
                gridLine={{ visible: true }}
              />
              <Axis
                id="left-axis"
                position="left"
                tickFormat={(value) => formatBytes(value)}
                gridLine={{ visible: true }}
              />
            </Chart>

            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow>
                <EuiText size="xs">
                  <b>
                    {ingestionRate.start} - {ingestionRate.end} (interval: {ingestionRate.interval})
                  </b>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiFlexGroup>
    </>
  );
}

function toLegendFormat(date: moment.Moment) {
  return date.format('MMM DD, YYYY @ DD:mm:ss');
}
