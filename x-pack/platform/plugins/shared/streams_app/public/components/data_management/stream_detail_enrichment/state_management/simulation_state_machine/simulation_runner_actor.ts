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
import { isEmpty } from 'lodash';
import { getFormattedError } from '../../../../../util/errors';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { processorConverter } from '../../utils';
import { Simulation, SimulationMachineDeps } from './types';
import { SchemaField } from '../../../schema_editor/types';
import { getMappedSchemaFields } from './utils';
import { convertToFieldDefinitionConfig } from '../../../schema_editor/utils';

export interface SimulationRunnerInput {
  streamName: string;
  detectedFields?: SchemaField[];
  documents: FlattenRecord[];
  processors: ProcessorDefinitionWithUIAttributes[];
}

export function createSimulationRunnerActor({
  streamsRepositoryClient,
}: Pick<SimulationMachineDeps, 'streamsRepositoryClient'>) {
  return fromPromise<Simulation, SimulationRunnerInput>(({ input, signal }) =>
    streamsRepositoryClient.fetch('POST /internal/streams/{name}/processing/_simulate', {
      signal,
      params: {
        path: { name: input.streamName },
        body: {
          documents: input.documents,
          processing: input.processors.map(processorConverter.toSimulateDefinition),
          detected_fields:
            input.detectedFields && !isEmpty(input.detectedFields)
              ? getMappedSchemaFields(input.detectedFields).map((field) => ({
                  name: field.name,
                  ...convertToFieldDefinitionConfig(field),
                }))
              : undefined,
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
    const formattedError = getFormattedError(event.error);
    toasts.addError(formattedError, {
      title: i18n.translate('xpack.streams.enrichment.simulation.simulationRunError', {
        defaultMessage: 'An issue occurred running the simulation.',
      }),
      toastMessage: formattedError.message,
    });
  };
}
