/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { TimeState } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import type { WithAllKeys } from '@kbn/presentation-publishing';
import {
  fetch$,
  initializeStateManager,
  initializeTitleManager,
  titleComparators,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { Streams } from '@kbn/streams-schema';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import React, { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject, Subject, merge } from 'rxjs';
import type { IDataStreamsStatsClient } from '@kbn/dataset-quality-plugin/public';
import { DataStreamsStatsService } from '@kbn/dataset-quality-plugin/public';
import type { StreamsAppStartDependencies } from '../types';
import type { StreamMetricsApi, StreamMetricsSerializedState, StreamMetricsState } from './types';
import { STREAM_METRICS_EMBEDDABLE_ID } from '../../common/embeddable';
import { StreamMetricsEmbeddableComponent } from './stream_metrics_embeddable_component';
import { getAggregations } from '../components/data_management/stream_detail_lifecycle/hooks/use_ingestion_rate';
import { getCalculatedStats } from '../components/data_management/stream_detail_lifecycle/helpers/get_calculated_stats';
import { formatBytes } from '../components/data_management/stream_detail_lifecycle/helpers/format_bytes';

const getDefaultTitle = (streamName?: string) =>
  streamName
    ? i18n.translate('xpack.streams.streamMetricsEmbeddable.defaultTitleWithName', {
        defaultMessage: 'Stream Metrics: {streamName}',
        values: { streamName },
      })
    : i18n.translate('xpack.streams.streamMetricsEmbeddable.defaultTitle', {
        defaultMessage: 'Stream Metrics',
      });

const defaultStreamMetricsState: WithAllKeys<StreamMetricsState> = {
  streamName: undefined,
};

export interface StreamMetricsFactoryDeps {
  coreStart: CoreStart;
  pluginsStart: StreamsAppStartDependencies;
}

export const getStreamMetricsEmbeddableFactory = ({
  coreStart,
  pluginsStart,
}: StreamMetricsFactoryDeps): EmbeddableFactory<
  StreamMetricsSerializedState,
  StreamMetricsApi
> => ({
  type: STREAM_METRICS_EMBEDDABLE_ID,
  buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
    const { streams } = pluginsStart;
    const streamsRepositoryClient = streams.streamsRepositoryClient;
    const dataStreamsClient = new DataStreamsStatsService()
      .start({ http: coreStart.http })
      .getClient();

    const titleManager = initializeTitleManager(initialState);
    const streamMetricsStateManager = initializeStateManager(
      initialState,
      defaultStreamMetricsState
    );
    const defaultTitle$ = new BehaviorSubject<string | undefined>(
      getDefaultTitle(initialState.streamName)
    );
    const reload$ = new Subject<boolean>();

    // Subscribe to stream name changes to update the default title dynamically
    const streamNameSubscription = streamMetricsStateManager.api.streamName$.subscribe(
      (streamName) => {
        defaultTitle$.next(getDefaultTitle(streamName));
      }
    );

    function serializeState(): StreamMetricsSerializedState {
      return {
        ...titleManager.getLatestState(),
        ...streamMetricsStateManager.getLatestState(),
      };
    }

    const unsavedChangesApi = initializeUnsavedChanges<StreamMetricsSerializedState>({
      uuid,
      parentApi,
      serializeState,
      anyStateChange$: merge(
        titleManager.anyStateChange$,
        streamMetricsStateManager.anyStateChange$
      ),
      getComparators: () => ({
        ...titleComparators,
        streamName: 'referenceEquality',
      }),
      onReset: (lastSaved) => {
        titleManager.reinitializeState(lastSaved);
        streamMetricsStateManager.reinitializeState(lastSaved);
      },
    });

    const api = finalizeApi({
      ...unsavedChangesApi,
      ...titleManager.api,
      ...streamMetricsStateManager.api,
      defaultTitle$,
      serializeState,
      setStreamName: (streamName: string | undefined) => {
        streamMetricsStateManager.api.setStreamName(streamName);
      },
      streamName$: streamMetricsStateManager.api.streamName$,
    });

    const fetchSubscription = fetch$(api)
      .pipe()
      .subscribe((next) => {
        reload$.next(next.isReload);
      });

    return {
      api,
      Component: () => {
        const [streamName] = useBatchedPublishingSubjects(
          streamMetricsStateManager.api.streamName$
        );

        const [definition, setDefinition] = useState<Streams.ingest.all.GetResponse | undefined>(
          undefined
        );
        const [isLoadingDefinition, setIsLoadingDefinition] = useState(false);
        const [definitionError, setDefinitionError] = useState<Error | undefined>(undefined);

        const [stats, setStats] = useState<any>(undefined);
        const [isLoadingStats, setIsLoadingStats] = useState(false);
        const [statsError, setStatsError] = useState<Error | undefined>(undefined);

        const [docCounts, setDocCounts] = useState<
          | {
              total: number;
              degraded: number;
              failed: number;
            }
          | undefined
        >(undefined);
        const [isLoadingDocCounts, setIsLoadingDocCounts] = useState(false);
        const [docCountsError, setDocCountsError] = useState<Error | undefined>(undefined);

        // Get time range from parent (dashboard)
        const timeState = useMemo((): TimeState => {
          const timeRange = pluginsStart.data.query.timefilter.timefilter.getTime();
          const absoluteRange = pluginsStart.data.query.timefilter.timefilter.getAbsoluteTime();
          const fromMs = new Date(absoluteRange.from).getTime();
          const toMs = new Date(absoluteRange.to).getTime();
          return {
            timeRange,
            start: fromMs,
            end: toMs,
            asAbsoluteTimeRange: {
              from: absoluteRange.from,
              to: absoluteRange.to,
              mode: 'absolute',
            },
          };
        }, []);

        // Fetch stream definition
        useEffect(() => {
          if (!streamName) {
            setDefinition(undefined);
            return;
          }

          const abortController = new AbortController();
          setIsLoadingDefinition(true);
          setDefinitionError(undefined);

          streamsRepositoryClient
            .fetch('GET /api/streams/{name} 2023-10-31', {
              signal: abortController.signal,
              params: { path: { name: streamName } },
            })
            .then((response) => {
              if (Streams.ingest.all.GetResponse.is(response)) {
                setDefinition(response);
              }
            })
            .catch((error) => {
              if (error.name !== 'AbortError') {
                setDefinitionError(error);
              }
            })
            .finally(() => {
              setIsLoadingDefinition(false);
            });

          return () => {
            abortController.abort();
          };
        }, [streamName]);

        // Fetch stats
        useEffect(() => {
          if (!streamName || !definition) {
            setStats(undefined);
            return;
          }

          const abortController = new AbortController();
          setIsLoadingStats(true);
          setStatsError(undefined);

          fetchStreamStats({
            streamName,
            definition,
            timeState,
            dataStreamsClient,
            streamsRepositoryClient,
            coreStart,
            pluginsStart,
            signal: abortController.signal,
          })
            .then((result) => {
              setStats(result);
            })
            .catch((error) => {
              if (error.name !== 'AbortError') {
                setStatsError(error);
              }
            })
            .finally(() => {
              setIsLoadingStats(false);
            });

          return () => {
            abortController.abort();
          };
        }, [streamName, definition, timeState]);

        // Fetch doc counts for data quality
        useEffect(() => {
          if (!streamName) {
            setDocCounts(undefined);
            return;
          }

          const abortController = new AbortController();
          setIsLoadingDocCounts(true);
          setDocCountsError(undefined);

          fetchDocCounts({
            streamName,
            timeState,
            streamsRepositoryClient,
            signal: abortController.signal,
          })
            .then((result) => {
              setDocCounts(result);
            })
            .catch((error) => {
              if (error.name !== 'AbortError') {
                setDocCountsError(error);
              }
            })
            .finally(() => {
              setIsLoadingDocCounts(false);
            });

          return () => {
            abortController.abort();
          };
        }, [streamName, timeState]);

        useEffect(() => {
          return () => {
            fetchSubscription.unsubscribe();
            streamNameSubscription.unsubscribe();
          };
        }, []);

        return (
          <EuiThemeProvider darkMode={coreStart.theme.getTheme().darkMode}>
            <KibanaContextProvider services={{ ...coreStart, ...pluginsStart }}>
              <StreamMetricsEmbeddableComponent
                streamName={streamName ?? ''}
                definition={definition}
                isLoadingDefinition={isLoadingDefinition}
                definitionError={definitionError}
                stats={stats}
                isLoadingStats={isLoadingStats}
                statsError={statsError}
                docCounts={docCounts}
                isLoadingDocCounts={isLoadingDocCounts}
                docCountsError={docCountsError}
                timeState={timeState}
                coreStart={coreStart}
                pluginsStart={pluginsStart}
              />
            </KibanaContextProvider>
          </EuiThemeProvider>
        );
      },
    };
  },
});

async function fetchStreamStats({
  streamName,
  definition,
  timeState,
  dataStreamsClient,
  streamsRepositoryClient,
  coreStart,
  pluginsStart,
  signal,
}: {
  streamName: string;
  definition: Streams.ingest.all.GetResponse;
  timeState: TimeState;
  dataStreamsClient: Promise<IDataStreamsStatsClient>;
  streamsRepositoryClient: StreamsRepositoryClient;
  coreStart: CoreStart;
  pluginsStart: StreamsAppStartDependencies;
  signal: AbortSignal;
}) {
  const client = await dataStreamsClient;

  const [
    {
      dataStreamsStats: [dsStats],
    },
    failureStore,
  ] = await Promise.all([
    client.getDataStreamsStats({
      datasetQuery: streamName,
      includeCreationDate: true,
    }),
    streamsRepositoryClient.fetch('GET /internal/streams/{name}/failure_store/stats', {
      signal,
      params: { path: { name: streamName } },
    }),
  ]);

  if (!dsStats || !dsStats.creationDate) {
    return undefined;
  }

  const dsAggregations = await getAggregations({
    definition,
    timeState,
    core: coreStart,
    search: pluginsStart.data.search,
    signal,
  });

  const dsSizeWithoutFs = Math.max(0, (dsStats.sizeBytes ?? 0) - (failureStore?.stats?.size ?? 0));

  const calculatedStats = getCalculatedStats({
    stats: {
      creationDate: dsStats.creationDate,
      totalDocs: dsStats.totalDocs,
      sizeBytes: dsSizeWithoutFs,
    },
    timeState,
    buckets: dsAggregations?.buckets,
  });

  return {
    ds: {
      stats: {
        ...dsStats,
        sizeBytes: dsSizeWithoutFs,
        size: formatBytes(dsSizeWithoutFs),
        ...calculatedStats,
      },
      aggregations: dsAggregations,
    },
  };
}

async function fetchDocCounts({
  streamName,
  timeState,
  streamsRepositoryClient,
  signal,
}: {
  streamName: string;
  timeState: TimeState;
  streamsRepositoryClient: StreamsRepositoryClient;
  signal: AbortSignal;
}) {
  const [totalResponse, degradedResponse] = await Promise.all([
    streamsRepositoryClient.fetch('GET /internal/streams/doc_counts/total', {
      signal,
      params: { query: { stream: streamName } },
    }),
    streamsRepositoryClient.fetch('GET /internal/streams/doc_counts/degraded', {
      signal,
      params: { query: { stream: streamName } },
    }),
  ]);

  // Failed doc count requires failure store read permissions - handle gracefully
  let failedCount = 0;
  try {
    const failedResponse = await streamsRepositoryClient.fetch(
      'GET /internal/streams/doc_counts/failed',
      {
        signal,
        params: {
          query: {
            stream: streamName,
            start: timeState.start,
            end: timeState.end,
          },
        },
      }
    );
    failedCount = failedResponse.find((stat) => stat.stream === streamName)?.count ?? 0;
  } catch {
    // Ignore failed doc count errors - user may not have failure store permissions
  }

  const totalCount = totalResponse.find((stat) => stat.stream === streamName)?.count ?? 0;
  const degradedCount = degradedResponse.find((stat) => stat.stream === streamName)?.count ?? 0;

  return {
    total: totalCount,
    degraded: degradedCount,
    failed: failedCount,
  };
}
