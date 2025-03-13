/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { IngestStreamGetResponse, isWiredStreamDefinition } from '@kbn/streams-schema';
import { ILM_LOCATOR_ID, IlmLocatorParams } from '@kbn/index-lifecycle-management-common-shared';

import { computeInterval } from '@kbn/visualization-utils';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { getIndexPatterns } from '../../util/hierarchy_helpers';
import { useDataStreamStats } from '../data_management/stream_detail_lifecycle/hooks/use_data_stream_stats';
import { QuickLinks } from './quick_links';
import { ChildStreamList } from './child_stream_list';
import { StreamStatsPanel } from './components/stream_stats_panel';
import { StreamChartPanel } from './components/stream_chart_panel';
import { TabsPanel } from './components/tabs_panel';

export function StreamDetailOverview({ definition }: { definition?: IngestStreamGetResponse }) {
  const {
    dependencies: {
      start: {
        data,
        dataViews,
        streams: { streamsRepositoryClient },
        share,
      },
    },
  } = useKibana();

  const {
    timeRange,
    setTimeRange,
    absoluteTimeRange: { start, end },
  } = data.query.timefilter.timefilter.useTimefilter();

  const indexPatterns = useMemo(() => {
    return getIndexPatterns(definition?.stream);
  }, [definition]);

  const discoverLocator = useMemo(
    () => share.url.locators.get('DISCOVER_APP_LOCATOR'),
    [share.url.locators]
  );

  const bucketSize = useMemo(() => computeInterval(timeRange, data), [data, timeRange]);

  const queries = useMemo(() => {
    if (!indexPatterns) {
      return undefined;
    }

    const baseQuery = `FROM ${indexPatterns.join(', ')}`;

    const histogramQuery = `${baseQuery} | STATS metric = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${bucketSize})`;

    return {
      baseQuery,
      histogramQuery,
    };
  }, [bucketSize, indexPatterns]);

  const discoverLink = useMemo(() => {
    if (!discoverLocator || !queries?.baseQuery) {
      return undefined;
    }

    return discoverLocator.getRedirectUrl({
      query: {
        esql: queries.baseQuery,
      },
    });
  }, [queries?.baseQuery, discoverLocator]);

  const histogramQueryFetch = useStreamsAppFetch(
    async ({ signal }) => {
      if (!queries?.histogramQuery || !indexPatterns) {
        return undefined;
      }

      const existingIndices = await dataViews.getExistingIndices(indexPatterns);

      if (existingIndices.length === 0) {
        return undefined;
      }

      return streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_histogram_for_stream',
            query: queries.histogramQuery,
            start,
            end,
          },
        },
        signal,
      });
    },
    [indexPatterns, dataViews, streamsRepositoryClient, queries?.histogramQuery, start, end]
  );

  const docCountFetch = useStreamsAppFetch(
    async ({ signal }) => {
      if (!definition) {
        return undefined;
      }
      return streamsRepositoryClient.fetch('GET /api/streams/{name}/_details', {
        signal,
        params: {
          path: {
            name: definition.stream.name,
          },
          query: {
            start: String(start),
            end: String(end),
          },
        },
      });
    },
    [definition, streamsRepositoryClient, start, end]
  );

  const dataStreamStats = useDataStreamStats({ definition });

  const tabs = useMemo(
    () => [
      ...(definition && isWiredStreamDefinition(definition.stream)
        ? [
            {
              id: 'streams',
              name: i18n.translate('xpack.streams.entityDetailOverview.tabs.streams', {
                defaultMessage: 'Streams',
              }),
              content: <ChildStreamList definition={definition} />,
            },
          ]
        : []),
      {
        id: 'quicklinks',
        name: i18n.translate('xpack.streams.entityDetailOverview.tabs.quicklinks', {
          defaultMessage: 'Quick Links',
        }),
        content: <QuickLinks definition={definition} />,
      },
    ],
    [definition]
  );

  const ilmLocator = share.url.locators.get<IlmLocatorParams>(ILM_LOCATOR_ID);

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" justifyContent="flexEnd">
            <EuiFlexItem grow>
              <StreamsAppSearchBar
                onQuerySubmit={({ dateRange }, isUpdate) => {
                  if (!isUpdate) {
                    histogramQueryFetch.refresh();
                    docCountFetch.refresh();
                    return;
                  }

                  if (dateRange) {
                    setTimeRange({ from: dateRange.from, to: dateRange?.to, mode: dateRange.mode });
                  }
                }}
                onRefresh={() => {
                  histogramQueryFetch.refresh();
                }}
                placeholder={i18n.translate(
                  'xpack.streams.entityDetailOverview.searchBarPlaceholder',
                  {
                    defaultMessage: 'Filter data by using KQL',
                  }
                )}
                dateRangeFrom={timeRange.from}
                dateRangeTo={timeRange.to}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <StreamStatsPanel
            definition={definition}
            dataStreamStats={dataStreamStats.stats}
            docCount={docCountFetch.value}
            ilmLocator={ilmLocator}
          />
        </EuiFlexItem>

        <EuiFlexItem grow>
          <EuiFlexGroup direction="row">
            <EuiFlexItem grow={4}>{definition && <TabsPanel tabs={tabs} />}</EuiFlexItem>
            <EuiFlexItem grow={8}>
              <StreamChartPanel
                histogramQueryFetch={histogramQueryFetch}
                discoverLink={discoverLink}
                timerange={{ start, end }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
