/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { ErrorActorEvent } from 'xstate';
import { fromPromise } from 'xstate';
import type { errors as esErrors } from '@elastic/elasticsearch';
import { isEmpty } from 'lodash';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { convertUIStepsToDSL } from '@kbn/streamlang';
import { getFormattedError } from '../../../../../util/errors';
import type { Simulation, SimulationMachineDeps } from './types';
import type { SchemaField } from '../../../schema_editor/types';
import { getMappedSchemaFields } from './utils';
import { convertToFieldDefinitionConfig } from '../../../schema_editor/utils';

export interface SimulationRunnerInput {
  streamName: string;
  detectedFields?: SchemaField[];
  documents: FlattenRecord[];
  steps: StreamlangStepWithUIAttributes[];
}

export function createSimulationRunnerActor({
  streamsRepositoryClient,
}: Pick<SimulationMachineDeps, 'streamsRepositoryClient'>) {
  return fromPromise<Simulation, SimulationRunnerInput>(({ input, signal }) =>
    simulateProcessing({
      streamsRepositoryClient,
      input,
      signal,
    })
  );
}

export const simulateProcessing = ({
  streamsRepositoryClient,
  input,
  signal = null,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  input: SimulationRunnerInput;
  signal?: AbortSignal | null;
}) => {
  const dsl = convertUIStepsToDSL(input.steps, false);

  return streamsRepositoryClient.fetch('POST /internal/streams/{name}/processing/_simulate', {
    signal,
    params: {
      path: { name: input.streamName },
      body: {
        documents: input.documents,
        processing: dsl,
        detected_fields:
          input.detectedFields && !isEmpty(input.detectedFields)
            ? getMappedSchemaFields(input.detectedFields).map((field) => ({
                name: field.name,
                ...convertToFieldDefinitionConfig(field),
              }))
            : undefined,
      },
    },
  });
};

export function createSimulationRunFailureNotifier({
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
