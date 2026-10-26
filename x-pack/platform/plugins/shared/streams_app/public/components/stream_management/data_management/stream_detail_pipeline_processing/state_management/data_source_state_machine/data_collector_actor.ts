/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SampleDocument } from '@kbn/streams-schema';
import { isRecord } from '@kbn/streams-schema';
import type { ErrorActorEvent } from 'xstate';
import { fromObservable } from 'xstate';
import type { errors as esErrors } from '@elastic/elasticsearch';
import type { EsQueryConfig, Filter, Query, TimeRange } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { Observable, catchError, filter, from, map, of, tap, throwError } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
import type { IEsSearchResponse } from '@kbn/search-types';
import { pick } from 'lodash';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { EnrichmentDataSource } from '../../../../../../../common/url_schema';
import type { StreamsTelemetryClient } from '../../../../../../telemetry/client';
import { getFormattedError } from '../../../../../../util/errors';
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
  uiSettings: DataSourceMachineDeps['uiSettings'];
}

type CollectorParams = Pick<
  CollectKqlDataParams,
  'data' | 'index' | 'telemetryClient' | 'streamType'
>;

interface FailureStoreCollectorParams {
  streamsRepositoryClient: StreamsRepositoryClient;
  streamName: string;
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
  uiSettings,
}: Pick<
  DataSourceMachineDeps,
  'data' | 'telemetryClient' | 'streamsRepositoryClient' | 'uiSettings'
>) {
  return fromObservable<SampleDocument[], SamplesFetchInput>(({ input }) => {
    const { dataSource, streamName, streamType } = input;

    return getDataCollectorForDataSource(dataSource)({
      data,
      index: streamName,
      streamName,
      telemetryClient,
      streamType,
      streamsRepositoryClient,
      uiSettings,
    });
  });
}

type AllCollectorParams = CollectorParams & {
  streamsRepositoryClient: StreamsRepositoryClient;
  uiSettings: DataSourceMachineDeps['uiSettings'];
  streamName: string;
};

/**
 * Returns the appropriate data collector function based on the data source type
 */
function getDataCollectorForDataSource(dataSource: EnrichmentDataSourceWithUIAttributes) {
  if (dataSource.type === 'failure-store') {
    return (args: AllCollectorParams) =>
      collectFailureStoreData({
        streamsRepositoryClient: args.streamsRepositoryClient,
        streamName: args.streamName,
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
  if (dataSource.type === 'latest-samples') {
    return (args: AllCollectorParams) =>
      collectKqlData({ ...args, dataSourceType: dataSource.type });
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
  streamName,
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
            path: { name: streamName },
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
              stream_name: streamName,
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

const MIN_SAMPLE_SIZE = 1;

/**
 * Returns true when the Kibana search response carries the ES
 * "async search response too large" error inside its attributes.
 * The error arrives as a resolved (non-thrown) response with
 * attributes.error.reason containing "max_async_search_response_size".
 */
function isAsyncSearchResponseTooLargeError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const attributes = (error as { attributes?: unknown }).attributes;
  if (!isRecord(attributes)) return false;
  const esError = (attributes as { error?: unknown }).error;
  if (isRecord(esError)) {
    const reason: unknown = (esError as { reason?: unknown }).reason;
    if (typeof reason === 'string' && reason.includes('max_async_search_response_size')) {
      return true;
    }
  }
  // Also check meta.body path for direct ES client errors
  const meta = (error as { meta?: unknown }).meta;
  if (isRecord(meta)) {
    const bodyError = (meta as { body?: { error?: { reason?: unknown } } }).body?.error?.reason;
    if (typeof bodyError === 'string' && bodyError.includes('max_async_search_response_size')) {
      return true;
    }
  }
  return false;
}

function collectKqlData({
  data,
  telemetryClient,
  dataSourceType,
  streamType,
  uiSettings,
  ...searchParams
}: CollectKqlDataParams): Observable<SampleDocument[]> {
  const abortController = new AbortController();
  const esQueryConfig = getEsQueryConfig(uiSettings);

  const fetchWithSize = (size: number): Observable<SampleDocument[]> => {
    const params = buildSamplesSearchParams(
      { ...searchParams, size },
      dataSourceType,
      esQueryConfig
    );

    return data.search.search({ params }, { abortSignal: abortController.signal }).pipe(
      filter(isValidSearchResult),
      map(extractDocumentsFromResult),
      catchError((error: unknown) => {
        if (isAsyncSearchResponseTooLargeError(error) && size > MIN_SAMPLE_SIZE) {
          return fetchWithSize(Math.max(MIN_SAMPLE_SIZE, Math.floor(size / 2)));
        }
        return throwError(() => error);
      })
    );
  };

  return new Observable((observer) => {
    let registerFetchLatency: () => void = () => {};

    const subscription = fetchWithSize(searchParams.size ?? 100)
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
        })
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
  return result.rawResponse.hits.hits.map((doc) => ({
    ...(doc._source as SampleDocument),
    _id: doc._id,
  }));
}

/**
 * Builds search parameters for Elasticsearch query
 */
function buildSamplesSearchParams(
  searchParams: SearchParamsOptions,
  dataSourceType: EnrichmentDataSource['type'],
  esQueryConfig: EsQueryConfig
) {
  const { filters, index, query, size = 100, timeRange } = searchParams;
  const queryDefinition = buildEsQuery(
    { title: index, fields: [] },
    query ?? [],
    filters ?? [],
    esQueryConfig
  );
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

export function notifyFetchMoreError(toasts: DataSourceMachineDeps['toasts'], error: unknown) {
  const formattedError = getFormattedError(error);
  toasts.addError(formattedError, {
    title: i18n.translate('xpack.streams.enrichment.fetchMore.error', {
      defaultMessage: 'Failed to load more matching samples.',
    }),
    toastMessage: formattedError.message,
  });
}

export function createFetchMoreFailureNotifier({
  toasts,
}: {
  toasts: DataSourceMachineDeps['toasts'];
}) {
  return (params: { event: unknown }) => {
    const event = params.event as ErrorActorEvent<esErrors.ResponseError, string>;
    notifyFetchMoreError(toasts, event.error);
  };
}
