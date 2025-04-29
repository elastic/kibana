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
import { filter, map } from 'rxjs';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { SimulationMachineDeps } from './types';

export interface SamplesFetchInput {
  condition?: Condition;
  filters: Filter[];
  query: Query;
  streamName: string;
}

export function createSamplesFetchActor({
  data,
  // streamsRepositoryClient,
  timeState$,
}: Pick<SimulationMachineDeps, 'data' | 'timeState$'>) {
  return fromObservable<SampleDocument[], SamplesFetchInput>(({ input }) => {
    const abortController = new AbortController();
    const { asAbsoluteTimeRange } = timeState$.getValue();

    // const samplesBody = await streamsRepositoryClient.fetch(
    //   'POST /internal/streams/{name}/_sample',
    //   {
    //     signal,
    //     params: {
    //       path: { name: input.streamName },
    //       body: {
    //         if: input.condition,
    //         start: new Date(asAbsoluteTimeRange.from).getTime(),
    //         end: new Date(asAbsoluteTimeRange.to).getTime(),
    //         size: 100,
    //       },
    //     },
    //   }
    // );

    // return samplesBody.documents;

    return data.search.search(
      {
        params: {
          index: input.streamName,
          ...buildSamplesSearchParams({
            condition: input.condition,
            filters: input.filters,
            index: input.streamName,
            query: input.query,
            timeRange: asAbsoluteTimeRange,
          }),
        },
      },
      {
        abortSignal: abortController.signal,
      }
    );
    // .pipe(
    //   // filter(
    //   //   (result) => !isRunningResponse(result) && result.rawResponse.hits?.hits !== undefined
    //   // ),
    //   map(
    //     (result) =>
    //       console.log('fdsfdsf', result) || result.rawResponse.hits.hits.map((doc) => doc._source)
    //   )
    // );
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
  filters: Filter[];
  index: string;
  query: Query;
  size?: number;
  timeRange: TimeRange;
}) => {
  const queryDefinition = buildEsQuery({ title: index, fields: [] }, query, filters);

  queryDefinition.bool.must.unshift(
    condition ? conditionToQueryDsl(condition) : { match_all: {} },
    {
      range: {
        '@timestamp': {
          gte: timeRange.from,
          lte: timeRange.to,
        },
      },
    }
  );

  const searchBody = {
    query: queryDefinition,
    sort: [
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    terminate_after: size,
    track_total_hits: false,
    size,
  };

  return searchBody;
};

export function createSamplesFetchFailureNofitier({
  toasts,
}: Pick<SimulationMachineDeps, 'toasts'>) {
  return (params: { event: unknown }) => {
    const event = params.event as ErrorActorEvent<esErrors.ResponseError, string>;
    toasts.addError(new Error(event.error.body.message), {
      title: i18n.translate('xpack.streams.enrichment.simulation.samplesFetchError', {
        defaultMessage: 'An issue occurred retrieving samples.',
      }),
      toastMessage: event.error.body.message,
    });
  };
}
