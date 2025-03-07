/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { flattenObjectNestedLast } from '@kbn/object-utils';
import { Condition, FlattenRecord } from '@kbn/streams-schema';
import { fromPromise, ErrorActorEvent } from 'xstate5';
import { errors as esErrors } from '@elastic/elasticsearch';
import { DateRangeContext } from '../../../../../state_management/date_range_state_machine';
import { SimulationMachineDeps } from './types';

export interface SamplesFetchInput {
  condition?: Condition;
  streamName: string;
  absoluteTimeRange: DateRangeContext['absoluteTimeRange'];
}

export function createSamplesFetchActor({
  streamsRepositoryClient,
}: Pick<SimulationMachineDeps, 'streamsRepositoryClient'>) {
  return fromPromise<FlattenRecord[], SamplesFetchInput>(async ({ input, signal }) => {
    const samplesBody = await streamsRepositoryClient.fetch('POST /internal/streams/{name}/_sample', {
      signal,
      params: {
        path: { name: input.streamName },
        body: {
          if: input.condition,
          start: input.absoluteTimeRange.start,
          end: input.absoluteTimeRange.end,
          size: 100,
        },
      },
    });

    return samplesBody.documents.map(flattenObjectNestedLast) as FlattenRecord[];
  });
}

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
