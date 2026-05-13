/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SampleDocument } from '@kbn/streams-schema';
import {
  definitionToESQLQuery,
  ensureMetadata,
  getParentId,
  isDraftStream,
  mergeSourceIntoDocuments,
  Streams,
  stripOtelAliases,
  withUnmappedFieldsDirective,
} from '@kbn/streams-schema';
import { BasicPrettyPrinter, Builder, Parser } from '@elastic/esql';
import type { ErrorActorEvent } from 'xstate';
import { fromObservable } from 'xstate';
import type { errors as esErrors } from '@elastic/elasticsearch';
import type { EsQueryConfig, Filter, Query, TimeRange } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { getESQLResults } from '@kbn/esql-utils';
import { Observable, filter, from, map, of, switchMap, tap } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
import type { IEsSearchResponse } from '@kbn/search-types';
import { pick } from 'lodash';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { EnrichmentDataSource } from '../../../../../../../common/url_schema';
import type { StreamsTelemetryClient } from '../../../../../../telemetry/client';
import { getFormattedError } from '../../../../../../util/errors';
import { esqlResultToPlainObjects } from '../../../../../../util/esql_result_to_plain_objects';
import type { DataSourceMachineDeps } from './types';
import type { EnrichmentDataSourceWithUIAttributes } from '../../types';

export interface SamplesFetchInput {
  dataSource: EnrichmentDataSourceWithUIAttributes;
  streamName: string;
  streamType: 'wired' | 'classic' | 'unknown';
  isDraft?: boolean;
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
    const { dataSource, streamName, streamType, isDraft } = input;

    const isSearchBased = dataSource.type === 'latest-samples' || dataSource.type === 'kql-samples';

    if (isDraft && isSearchBased) {
      return from(resolveDraftSampleSource(streamsRepositoryClient, streamName)).pipe(
        switchMap(({ baseQuery }) => {
          const { root } = Parser.parse(ensureMetadata(baseQuery));

          root.commands.push(
            Builder.command({
              name: 'sort',
              args: [
                Builder.expression.order(Builder.expression.column('@timestamp'), {
                  order: 'DESC',
                  nulls: '',
                }),
              ],
            }),
            Builder.command({
              name: 'limit',
              args: [Builder.expression.literal.integer(100)],
            })
          );
          const esqlQuery = withUnmappedFieldsDirective(
            BasicPrettyPrinter.multiline(root, { pipeTab: '' })
          );

          return collectEsqlSamples({
            data,
            telemetryClient,
            streamType,
            streamName,
            dataSourceType: dataSource.type,
            esqlQuery,
            mergeSource: true,
          });
        })
      );
    }

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

interface DraftSampleSource {
  baseQuery: string;
}

/**
 * Builds an ES|QL query for fetching pre-processing samples for a draft
 * stream. Uses `definitionToESQLQuery` with `includeProcessing: false` so
 * the query includes the parent FROM source, routing condition casts, and
 * WHERE clause — but omits processing steps and field-type casts. This
 * keeps a single source of truth for the draft query shape.
 *
 * Falls back to a simple `FROM <root>` when the parent cannot be resolved.
 */
async function resolveDraftSampleSource(
  streamsRepositoryClient: StreamsRepositoryClient,
  streamName: string
): Promise<DraftSampleSource> {
  const parentId = getParentId(streamName);
  if (!parentId) {
    throw new Error(`Draft stream "${streamName}" must have a parent stream`);
  }

  const [draftDef, parentDef] = await Promise.all([
    streamsRepositoryClient.fetch('GET /api/streams/{name} 2023-10-31', {
      signal: null,
      params: { path: { name: streamName } },
    }),
    streamsRepositoryClient.fetch('GET /api/streams/{name} 2023-10-31', {
      signal: null,
      params: { path: { name: parentId } },
    }),
  ]);

  if (
    !Streams.WiredStream.GetResponse.is(draftDef) ||
    !Streams.WiredStream.GetResponse.is(parentDef)
  ) {
    throw new Error(
      `Draft stream "${streamName}" and parent "${parentId}" must both be wired streams`
    );
  }

  const routingEntry = parentDef.stream.ingest.wired.routing.find(
    (r) => r.destination === streamName
  );
  const routingCondition = routingEntry?.where ?? { always: {} };

  const parentIsDraft = isDraftStream(parentDef.stream);

  const baseQuery = await definitionToESQLQuery({
    definition: draftDef.stream,
    routingCondition,
    inheritedFields: parentIsDraft
      ? undefined
      : { ...parentDef.inherited_fields, ...parentDef.stream.ingest.wired.fields },
    includeProcessing: false,
  });

  return { baseQuery };
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

/**
 * Core function to collect data using KQL
 */
function collectEsqlSamples({
  data,
  telemetryClient,
  streamType,
  streamName,
  dataSourceType,
  esqlQuery,
  filter: userFilter,
  timeRange,
  mergeSource = false,
}: {
  data: DataSourceMachineDeps['data'];
  telemetryClient: StreamsTelemetryClient;
  streamType: 'wired' | 'classic' | 'unknown';
  streamName: string;
  dataSourceType: EnrichmentDataSource['type'];
  esqlQuery: string;
  filter?: ReturnType<typeof buildEsQuery>;
  timeRange?: TimeRange;
  mergeSource?: boolean;
}): Observable<SampleDocument[]> {
  const abortController = new AbortController();

  return new Observable((observer) => {
    let registerFetchLatency: () => void = () => {};

    const execute = async () => {
      registerFetchLatency = telemetryClient.startTrackingSimulationSamplesFetchLatency({
        stream_name: streamName,
        stream_type: streamType,
        data_source_type: dataSourceType,
      });

      const { response } = await getESQLResults({
        esqlQuery,
        search: data.search.search,
        signal: abortController.signal,
        filter: userFilter,
        timeRange: timeRange
          ? { from: timeRange.from, to: timeRange.to, mode: 'absolute' as const }
          : undefined,
      });

      let docs = esqlResultToPlainObjects<SampleDocument>(response);

      if (mergeSource) {
        docs = mergeSourceIntoDocuments(docs);
      }

      return stripOtelAliases(docs);
    };

    execute()
      .then((docs) => {
        observer.next(docs);
        observer.complete();
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          observer.error(err);
        }
      })
      .finally(() => {
        registerFetchLatency();
      });

    return () => {
      abortController.abort();
    };
  });
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
  const params = buildSamplesSearchParams(searchParams, dataSourceType, esQueryConfig);

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
