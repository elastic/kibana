/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SampleDocument } from '@kbn/streams-schema';
import { ErrorActorEvent, fromObservable } from 'xstate5';
import type { errors as esErrors } from '@elastic/elasticsearch';
import { Filter, Query, TimeRange, buildEsQuery } from '@kbn/es-query';
import { Observable, filter, map, of } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { IEsSearchResponse } from '@kbn/search-types';
import { getFormattedError } from '../../../../../util/errors';
import { DataSourceMachineDeps } from './types';
import {
  CustomSamplesDataSourceWithUIAttributes,
  EnrichmentDataSourceWithUIAttributes,
  KqlSamplesDataSourceWithUIAttributes,
} from '../../types';

export interface SamplesFetchInput {
  dataSource: EnrichmentDataSourceWithUIAttributes;
  streamName: string;
}

interface CollectKqlDataParams {
  data: DataSourceMachineDeps['data'];
  filters?: Filter[];
  query?: Query;
  time?: TimeRange;
  streamName: string;
  size?: number;
}

interface SearchParamsOptions {
  filters?: Filter[];
  index: string;
  query?: Query;
  size?: number;
  timeRange?: TimeRange;
}

type CollectorParams = Pick<CollectKqlDataParams, 'data' | 'streamName'>;

/**
 * Creates a data collector actor that fetches sample documents based on the data source type
 */
export function createDataCollectorActor({ data }: Pick<DataSourceMachineDeps, 'data'>) {
  return fromObservable<SampleDocument[], SamplesFetchInput>(({ input }) => {
    const { dataSource, streamName } = input;
    return getDataCollectorForDataSource(dataSource)({
      data,
      streamName,
    });
  });
}

/**
 * Returns the appropriate data collector function based on the data source type
 */
function getDataCollectorForDataSource(dataSource: EnrichmentDataSourceWithUIAttributes) {
  if (dataSource.type === 'random-samples') {
    return collectRandomSamples;
  }
  if (dataSource.type === 'kql-samples') {
    return (args: CollectorParams) => collectKqlSamples({ ...args, dataSource });
  }
  if (dataSource.type === 'custom-samples') {
    return () => collectCustomSamples({ dataSource });
  }
  return () => of<SampleDocument[]>([]);
}

/**
 * Collects random samples from the specified stream
 */
function collectRandomSamples({ data, streamName }: CollectorParams): Observable<SampleDocument[]> {
  return collectKqlData({ data, streamName });
}

/**
 * Collects samples based on KQL query
 */
function collectKqlSamples({
  data,
  dataSource,
  streamName,
}: CollectorParams & {
  dataSource: KqlSamplesDataSourceWithUIAttributes;
}): Observable<SampleDocument[]> {
  return collectKqlData({
    data,
    time: dataSource.time,
    query: dataSource.query,
    streamName,
  });
}

/**
 * Returns custom sample documents directly
 */
function collectCustomSamples({
  dataSource,
}: {
  dataSource: CustomSamplesDataSourceWithUIAttributes;
}): Observable<SampleDocument[]> {
  return of(dataSource.documents);
}

/**
 * Core function to collect data using KQL
 */
function collectKqlData({
  data,
  filters,
  query,
  time,
  streamName,
  size,
}: CollectKqlDataParams): Observable<SampleDocument[]> {
  const abortController = new AbortController();

  return new Observable((observer) => {
    const subscription = data.search
      .search(
        {
          params: buildSamplesSearchParams({
            filters,
            index: streamName,
            query,
            timeRange: time,
            size,
          }),
        },
        { abortSignal: abortController.signal }
      )
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
        defaultMessage: 'An issue occurred retrieving data source documents.',
      }),
      toastMessage: error.message,
    });
  };
}
