/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ProcessorDefinition,
  SampleDocument,
  Streams,
  getParentId,
  isNamespacedEcsField,
} from '@kbn/streams-schema';
import { ErrorActorEvent, fromObservable } from 'xstate5';
import type { errors as esErrors } from '@elastic/elasticsearch';
import { Filter, Query, TimeRange, buildEsQuery } from '@kbn/es-query';
import { Observable, filter, map, of } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { IEsSearchResponse } from '@kbn/search-types';
import { pick } from 'lodash';
import { getESQLResults } from '@kbn/esql-utils';
import { RecursiveRecord } from '@kbn/streams-schema/src/shared/record_types';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import { getFormattedError } from '../../../../../util/errors';
import { DataSourceMachineDeps } from './types';
import { EnrichmentDataSourceWithUIAttributes } from '../../types';
import { definitionToESQLQuery } from '../../../../../util/definition_to_esql';

export interface SamplesFetchInput {
  dataSource: EnrichmentDataSourceWithUIAttributes;
  streamName: string;
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
}

interface CollectDraftESQLDataParams extends SearchParamsOptions {
  data: DataSourceMachineDeps['data'];
  streamsRepositoryClient: DataSourceMachineDeps['streamsRepositoryClient'];
  processingSteps?: ProcessorDefinition[];
}

type CollectorParams = Pick<
  CollectDraftESQLDataParams,
  'data' | 'index' | 'streamsRepositoryClient'
>;

/**
 * Creates a data collector actor that fetches sample documents based on the data source type
 */
export function createDataCollectorActor({
  data,
  streamsRepositoryClient,
}: Pick<DataSourceMachineDeps, 'data' | 'streamsRepositoryClient'>) {
  return fromObservable<SampleDocument[], SamplesFetchInput>(({ input }) => {
    const { dataSource, streamName } = input;
    return getDataCollectorForDataSource(dataSource)({
      data,
      streamsRepositoryClient,
      index: streamName,
    });
  });
}

/**
 * Returns the appropriate data collector function based on the data source type
 */
function getDataCollectorForDataSource(dataSource: EnrichmentDataSourceWithUIAttributes) {
  if (dataSource.type === 'random-samples') {
    return (args: CollectorParams) => {
      if (!dataSource.forDraftStream) {
        return collectKqlData(args);
      }
      // For draft streams, we need to fetch the data via ESQL with the extra processing steps from the parent
      return collectDraftEsqlData({ ...args, processingSteps: dataSource.processingSteps });
    };
  }
  if (dataSource.type === 'kql-samples') {
    return (args: CollectorParams) =>
      collectKqlData({ ...args, ...pick(dataSource, ['filters', 'query', 'timeRange']) });
  }
  if (dataSource.type === 'custom-samples') {
    return () => of(dataSource.documents);
  }
  return () => of<SampleDocument[]>([]);
}

function collectDraftEsqlData(params: CollectDraftESQLDataParams): Observable<SampleDocument[]> {
  const { data, index, streamsRepositoryClient, processingSteps } = params;
  const abortController = new AbortController();

  const parentId = getParentId(index);

  return new Observable((observer) => {
    Promise.all([
      streamsRepositoryClient.fetch('GET /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: parentId! },
        },
        signal: abortController.signal,
      }),
      streamsRepositoryClient.fetch('GET /api/streams/{name} 2023-10-31', {
        params: { path: { name: index } },
        signal: abortController.signal,
      }),
    ])
      .then(([parent, self]) => {
        if (
          !Streams.WiredStream.GetResponse.is(parent) ||
          !Streams.WiredStream.GetResponse.is(self)
        ) {
          throw new Error('The parent or the stream itself is not a wired stream');
        }
        const esqlQuery = `${definitionToESQLQuery(self, parent, {
          includeSource: true,
        })!} | LIMIT ${params.size ?? 100}`;
        return getESQLResults({
          esqlQuery,
          search: data.search.search,
          signal: abortController.signal,
          dropNullColumns: true,
        });
      })
      .then(({ response }) => {
        if (response.columns) {
          const columns = response.columns.map((col) => ({
            name: col.name,
            type: col.type,
          }));
          const sourceColumnIndex = columns.findIndex((col) => col.name === '_source');
          const sourceColumn = columns[sourceColumnIndex];
          observer.next(
            response.values.map((row) => {
              const doc: SampleDocument = flattenObjectNestedLast(
                row[sourceColumnIndex] as RecursiveRecord
              ) as RecursiveRecord;
              row.forEach((value, i) => {
                if (columns[i] !== sourceColumn && isNamespacedEcsField(columns[i].name)) {
                  doc[columns[i].name] = value as RecursiveRecord;
                }
              });
              return doc;
            })
          );
        } else {
          throw new Error('ESQL response does not contain columns');
        }
        observer.complete();
      });

    return () => {
      abortController.abort();
    };
  });
}

/**
 * Core function to collect data using KQL
 */
function collectKqlData({
  data,
  ...searchParams
}: CollectKqlDataParams): Observable<SampleDocument[]> {
  const abortController = new AbortController();
  const params = buildSamplesSearchParams(searchParams);

  return new Observable((observer) => {
    const subscription = data.search
      .search({ params }, { abortSignal: abortController.signal })
      .pipe(filter(isValidSearchResult), map(extractDocumentsFromResult))
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
function buildSamplesSearchParams({
  filters,
  index,
  query,
  size = 100,
  timeRange,
}: SearchParamsOptions) {
  const queryDefinition = buildEsQuery({ title: index, fields: [] }, query ?? [], filters ?? []);
  addTimeRangeToQuery(queryDefinition, timeRange);

  return {
    index,
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
    terminate_after: size,
    track_total_hits: false,
  };
}

/**
 * Adds time range to the query definition if provided
 */
function addTimeRangeToQuery(queryDefinition: any, timeRange?: TimeRange): void {
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
export function createDataCollectionFailureNofitier({
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
