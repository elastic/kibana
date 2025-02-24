/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import { lastValueFrom } from 'rxjs';
import { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { i18n } from '@kbn/i18n';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
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
    dependencies: {
      start: { data },
    },
  } = useKibana();
  const { timeRange, setTimeRange } = useDateRange({ data });

  const {
    loading: isLoadingIngestionRate,
    value: ingestionRate,
    error: ingestionRateError,
  } = useStreamsAppFetch(
    async ({ signal }) => {
      if (!definition || isLoadingStats || !stats?.bytesPerDay) {
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
              start: timeRange.from,
              end: timeRange.to,
              index: definition.stream.name,
            }),
          },
          { abortSignal: signal }
        )
      );

      return rawResponse.aggregations.docs_count.buckets.map(({ key, doc_count: docCount }) => ({
        key,
        value: docCount * stats.bytesPerDoc,
      }));
    },
    [data.search, definition, stats, isLoadingStats, timeRange]
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

      <EuiSpacer size="s" />

      {ingestionRateError ? (
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          style={{ width: '100%', height: '250px' }}
        >
          Failed to load ingestion rate
        </EuiFlexGroup>
      ) : isLoadingIngestionRate || isLoadingStats || !ingestionRate ? (
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          style={{ width: '100%', height: '250px' }}
        >
          <EuiLoadingChart />
        </EuiFlexGroup>
      ) : (
        <Chart size={{ height: 250 }}>
          <Settings showLegend={false} />
          <AreaSeries
            id="ingestionRate"
            name="Ingestion rate"
            data={ingestionRate}
            color="#61A2FF"
            xScaleType="time"
            xAccessor={'key'}
            yAccessors={['value']}
          />

          <Axis
            id="bottom-axis"
            position="bottom"
            tickFormat={(value) => moment(value).format('YYYY-MM-DD')}
            gridLine={{ visible: false }}
          />
          <Axis
            id="left-axis"
            position="left"
            tickFormat={(value) => formatBytes(value)}
            gridLine={{ visible: true }}
          />
        </Chart>
      )}
    </>
  );
}
