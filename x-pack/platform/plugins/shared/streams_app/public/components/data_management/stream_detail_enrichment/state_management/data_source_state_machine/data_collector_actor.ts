/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SampleDocument } from '@kbn/streams-schema';
import type { ErrorActorEvent } from 'xstate';
import { fromObservable } from 'xstate';
import type { errors as esErrors } from '@elastic/elasticsearch';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { Observable, filter, from, map, of, tap } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
import type { IEsSearchResponse } from '@kbn/search-types';
import { pick } from 'lodash';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { EnrichmentDataSource } from '../../../../../../common/url_schema';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
import { getFormattedError } from '../../../../../util/errors';
import type { DataSourceMachineDeps } from './types';
import type { EnrichmentDataSourceWithUIAttributes } from '../../types';

export interface SamplesFetchInput {
  dataSource: EnrichmentDataSourceWithUIAttributes;
  streamName: string;
  streamType: 'wired' | 'classic' | 'unknown';
}

interface SearchParamsOptions {
  filters?: Filter[];
  index: string;
  query?: Query;
  size?: number;
  timeRange?: TimeRange;
}

interface CollectKqlDataParams extends SearchParamsOptions {
  data: DataSourceMachineDeps['data'];
  telemetryClient: StreamsTelemetryClient;
  dataSourceType: EnrichmentDataSource['type'];
  streamType: 'wired' | 'classic' | 'unknown';
}

type CollectorParams = Pick<
  CollectKqlDataParams,
  'data' | 'index' | 'telemetryClient' | 'streamType'
>;

interface FailureStoreCollectorParams {
  streamsRepositoryClient: StreamsRepositoryClient;
  index: string;
  telemetryClient: StreamsTelemetryClient;
  streamType: 'wired' | 'classic' | 'unknown';
  timeRange?: { from: string; to: string };
}

const SEARCH_TIMEOUT = '10s';

/**
 * Creates a data collector actor that fetches sample documents based on the data source type
 */
export function createDataCollectorActor({
  data,
  telemetryClient,
  streamsRepositoryClient,
}: Pick<DataSourceMachineDeps, 'data' | 'telemetryClient' | 'streamsRepositoryClient'>) {
  return fromObservable<SampleDocument[], SamplesFetchInput>(({ input }) => {
    const { dataSource, streamName, streamType } = input;
    return getDataCollectorForDataSource(dataSource)({
      data,
      index: streamName,
      telemetryClient,
      streamType,
      streamsRepositoryClient,
    });
  });
}

type AllCollectorParams = CollectorParams & {
  streamsRepositoryClient: StreamsRepositoryClient;
};

/**
 * Returns the appropriate data collector function based on the data source type
 */
function getDataCollectorForDataSource(dataSource: EnrichmentDataSourceWithUIAttributes) {
  if (dataSource.type === 'latest-samples') {
    return (args: AllCollectorParams) =>
      collectKqlData({ ...args, dataSourceType: dataSource.type });
  }
  if (dataSource.type === 'failure-store') {
    return (args: AllCollectorParams) =>
      collectFailureStoreData({
        streamsRepositoryClient: args.streamsRepositoryClient,
        index: args.index,
        telemetryClient: args.telemetryClient,
        streamType: args.streamType,
        timeRange: dataSource.timeRange,
      });
  }
  if (dataSource.type === 'kql-samples') {
    return (args: AllCollectorParams) =>
      collectKqlData({
        ...args,
        ...pick(dataSource, ['filters', 'query', 'timeRange']),
        dataSourceType: dataSource.type,
      });
  }
  if (dataSource.type === 'custom-samples') {
    return () => of(dataSource.documents);
  }
  return () => of<SampleDocument[]>([]);
}

/**
 * Fetches documents from the failure store with parent processors applied via backend endpoint
 */
function collectFailureStoreData({
  streamsRepositoryClient,
  telemetryClient,
  streamType,
  index,
  timeRange,
}: FailureStoreCollectorParams): Observable<SampleDocument[]> {
  const abortController = new AbortController();

  return new Observable((observer) => {
    let registerFetchLatency: () => void = () => {};

    const subscription = from(
      streamsRepositoryClient.fetch(
        'GET /internal/streams/{name}/processing/_failure_store_samples',
        {
          signal: abortController.signal,
          params: {
            path: { name: index },
            query: {
              size: 100,
              ...(timeRange?.from && { start: timeRange.from }),
              ...(timeRange?.to && { end: timeRange.to }),
            },
          },
        }
      )
    )
      .pipe(
        tap({
          subscribe: () => {
            registerFetchLatency = telemetryClient.startTrackingSimulationSamplesFetchLatency({
              stream_name: index,
              stream_type: streamType,
              data_source_type: 'failure-store',
            });
          },
          finalize: () => {
            registerFetchLatency();
          },
        }),
        map((response) => response.documents as SampleDocument[])
      )
      .subscribe(observer);

    return () => {
      abortController.abort();
      subscription.unsubscribe();
    };
  });
}

/**
 * Core function to collect data using KQL
 */
function collectKqlData({
  data,
  telemetryClient,
  dataSourceType,
  streamType,
  ...searchParams
}: CollectKqlDataParams): Observable<SampleDocument[]> {
  const abortController = new AbortController();
  const params = buildSamplesSearchParams(searchParams, dataSourceType);

  return new Observable((observer) => {
    let registerFetchLatency: () => void = () => {};

    const subscription = data.search
      .search({ params }, { abortSignal: abortController.signal })
      .pipe(
        tap({
          subscribe: () => {
            registerFetchLatency = telemetryClient.startTrackingSimulationSamplesFetchLatency({
              stream_name: searchParams.index,
              stream_type: streamType,
              data_source_type: dataSourceType,
            });
          },
          finalize: () => {
            registerFetchLatency();
          },
        }),
        filter(isValidSearchResult),
        map(extractDocumentsFromResult)
      )
      .subscribe(observer);

    return () => {
      abortController.abort();
      subscription.unsubscribe();
    };
  });
}

/**
 * Validates if the search result contains hits
 */
function isValidSearchResult(result: IEsSearchResponse): boolean {
  return !isRunningResponse(result) && result.rawResponse.hits?.hits !== undefined;
}

/**
 * Extracts documents from search result
 */
function extractDocumentsFromResult(result: IEsSearchResponse): SampleDocument[] {
  return result.rawResponse.hits.hits.map((doc) => doc._source);
}

/**
 * Builds search parameters for Elasticsearch query
 */
function buildSamplesSearchParams(
  searchParams: SearchParamsOptions,
  dataSourceType: EnrichmentDataSource['type']
) {
  const { filters, index, query, size = 100, timeRange } = searchParams;
  const queryDefinition = buildEsQuery({ title: index, fields: [] }, query ?? [], filters ?? []);
  addTimeRangeToQuery(queryDefinition, timeRange);

  return {
    index: dataSourceType === 'failure-store' ? `${index}::failures` : index,
    allow_no_indices: true,
    query: queryDefinition,
    sort: [
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    size,
    track_total_hits: false,
    timeout: SEARCH_TIMEOUT,
  };
}

/**
 * Adds time range to the query definition if provided
 */
function addTimeRangeToQuery(
  queryDefinition: ReturnType<typeof buildEsQuery>,
  timeRange?: TimeRange
): void {
  if (timeRange) {
    queryDefinition.bool.must.unshift({
      range: {
        '@timestamp': {
          gte: timeRange.from,
          lte: timeRange.to,
        },
      },
    });
  }
}

/**
 * Creates a notifier for data collection failures
 */
export function createDataCollectionFailureNotifier({
  toasts,
}: {
  toasts: DataSourceMachineDeps['toasts'];
}) {
  return (params: { event: unknown }) => {
    const event = params.event as ErrorActorEvent<esErrors.ResponseError, string>;
    const error = getFormattedError(event.error);
    toasts.addError(error, {
      title: i18n.translate('xpack.streams.enrichment.dataSources.dataCollectionError', {
        defaultMessage: 'An issue occurred retrieving documents from the data source.',
      }),
      toastMessage: error.message,
    });
  };
}
