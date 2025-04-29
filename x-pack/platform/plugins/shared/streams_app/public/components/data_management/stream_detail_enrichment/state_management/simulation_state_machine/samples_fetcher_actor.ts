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
import { Observable, filter, map } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { getFormattedError } from '../../../../../util/errors';
import { SimulationMachineDeps } from './types';

export interface SamplesFetchInput {
  condition?: Condition;
  filters: Filter[];
  query: Query;
  streamName: string;
}

export function createSamplesFetchActor({
  data,
  timeState$,
}: Pick<SimulationMachineDeps, 'data' | 'timeState$'>) {
  return fromObservable<SampleDocument[], SamplesFetchInput>(({ input }) => {
    const abortController = new AbortController();
    // const { asAbsoluteTimeRange } = timeState$.getValue();

    const { query, filters, time } = data.query.getState();

    return new Observable((observer) => {
      const subscription = data.search
        .search(
          {
            params: buildSamplesSearchParams({
              condition: input.condition,
              filters,
              index: input.streamName,
              query: query as Query,
              timeRange: time,
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

  queryDefinition.bool.must.unshift(
    condition ? conditionToQueryDsl(condition) : { match_all: {} },
    {
      range: {
        '@timestamp': {
          gte: timeRange?.from,
          lte: timeRange?.to,
        },
      },
    }
  );

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

export function createSamplesFetchFailureNofitier({
  toasts,
}: Pick<SimulationMachineDeps, 'toasts'>) {
  return (params: { event: unknown }) => {
    const event = params.event as ErrorActorEvent<esErrors.ResponseError, string>;
    const error = getFormattedError(event.error);
    toasts.addError(error, {
      title: i18n.translate('xpack.streams.enrichment.simulation.samplesFetchError', {
        defaultMessage: 'An issue occurred retrieving samples.',
      }),
      toastMessage: error.message,
    });
  };
}
