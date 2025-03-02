/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FlattenRecord } from '@kbn/streams-schema';
import { fromPromise, ErrorActorEvent } from 'xstate5';
import { errors as esErrors } from '@elastic/elasticsearch';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { processorConverter } from '../../utils';
import { Simulation, SimulationMachineDeps } from './types';

export interface SimulationRunnerInput {
  streamName: string;
  documents: FlattenRecord[];
  processors: ProcessorDefinitionWithUIAttributes[];
}

export function createSimulationRunnerActor({
  streamsRepositoryClient,
}: Pick<SimulationMachineDeps, 'streamsRepositoryClient'>) {
  return fromPromise<Simulation, SimulationRunnerInput>(({ input, signal }) =>
    streamsRepositoryClient.fetch('POST /api/streams/{name}/processing/_simulate', {
      signal,
      params: {
        path: { name: input.streamName },
        body: {
          documents: input.documents,
          processing: input.processors.map(processorConverter.toSimulateDefinition),
        },
      },
    })
  );
}

export function createSimulationRunFailureNofitier({
  toasts,
}: Pick<SimulationMachineDeps, 'toasts'>) {
  return (params: { event: unknown }) => {
    const event = params.event as ErrorActorEvent<esErrors.ResponseError, string>;
    toasts.addError(new Error(event.error.body.message), {
      title: i18n.translate('xpack.streams.enrichment.simulation.simulationRunError', {
        defaultMessage: 'An issue occurred running the simulation.',
      }),
      toastMessage: event.error.body.message,
    });
  };
}
