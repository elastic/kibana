/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Condition, SampleDocument, conditionToQueryDsl } from '@kbn/streams-schema';
import { ErrorActorEvent, fromObservable } from 'xstate5';
import type { errors as esErrors } from '@elastic/elasticsearch';
import { Filter, Query, TimeRange, buildEsQuery } from '@kbn/es-query';
import { Observable, filter, from, map } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { getFormattedError } from '../../../../../util/errors';
import { DataSourceMachineDeps } from './types';
import { EnrichmentDataSourceWithUIAttributes } from '../../types';

export interface SamplesFetchInput {
  condition?: Condition;
  dataSource: EnrichmentDataSourceWithUIAttributes;
  streamName: string;
}

export function createDataCollectorActor({ data }: Pick<DataSourceMachineDeps, 'data'>) {
  return fromObservable<SampleDocument[], SamplesFetchInput>(({ input }) => {
    if (input.dataSource.type === 'random-samples') {
      return collectKqlData({
        data,
        condition: input.condition,
        streamName: input.streamName,
      });
    }

    if (input.dataSource.type === 'kql-samples') {
      return collectKqlData({
        data,
        condition: input.condition,
        time: input.dataSource.time,
        query: input.dataSource.query,
        streamName: input.streamName,
      });
    }

    if (input.dataSource.type === 'custom-samples') {
      return from<SampleDocument[]>([]);
    }

    return from<SampleDocument[]>([]);
  });
}

function collectKqlData({
  data,
  condition,
  filters,
  query,
  time,
  streamName,
  size,
}: {
  data: DataSourceMachineDeps['data'];
  condition?: Condition;
  filters?: Filter[];
  query?: Query;
  time?: TimeRange;
  streamName: string;
  size?: number;
}) {
  const abortController = new AbortController();

  return new Observable((observer) => {
    const subscription = data.search
      .search(
        {
          params: buildSamplesSearchParams({
            condition,
            filters,
            index: streamName,
            query,
            timeRange: time,
            size,
          }),
        },
        {
          abortSignal: abortController.signal,
        }
      )
      .pipe(
        filter(
          (result) => !isRunningResponse(result) && result.rawResponse.hits?.hits !== undefined
        ),
        map((result) => result.rawResponse.hits.hits.map((doc) => doc._source))
      )
      .subscribe(observer);

    return () => {
      // Abort logic when unsubscribed
      abortController.abort();
      subscription.unsubscribe();
    };
  });
}

const buildSamplesSearchParams = ({
  condition,
  filters,
  index,
  query,
  size = 100,
  timeRange,
}: {
  condition?: Condition;
  filters?: Filter[];
  index: string;
  query?: Query;
  size?: number;
  timeRange?: TimeRange;
}) => {
  const queryDefinition = buildEsQuery({ title: index, fields: [] }, query ?? [], filters ?? []);

  queryDefinition.bool.must.unshift(condition ? conditionToQueryDsl(condition) : { match_all: {} });

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

  const searchBody = {
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

  return searchBody;
};

export function createDataCollectionFailureNofitier({
  toasts,
}: Pick<DataSourceMachineDeps, 'toasts'>) {
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
