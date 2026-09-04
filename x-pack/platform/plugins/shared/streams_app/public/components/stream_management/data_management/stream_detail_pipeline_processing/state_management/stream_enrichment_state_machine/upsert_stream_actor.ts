/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { errors as esErrors } from '@elastic/elasticsearch';
import type { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { Pipeline } from '@kbn/ingest-pipelines-plugin/common/types';
import type { Streams } from '@kbn/streams-schema';
import type { FieldDefinition } from '@kbn/streams-schema';
import type { ErrorActorEvent } from 'xstate';
import { fromPromise } from 'xstate';
import type { ConfigurationMode } from '../../../../../../telemetry/types';
import { getFormattedError } from '../../../../../../util/errors';
import { getStreamTypeFromDefinition } from '../../../../../../util/get_stream_type_from_definition';
import type { PipelineProcessorsUiDefinition } from '../../types';
import type { ProcessingPersistenceAdapter } from '../../processing_persistence_adapter';
import type { StreamEnrichmentServiceDependencies } from './types';

export type UpsertStreamResponse = Pipeline;

export interface UpsertStreamInput {
  definition: Streams.ingest.all.GetResponse;
  pipeline: Pipeline;
  processingPersistenceAdapter: ProcessingPersistenceAdapter;
  pipelineDefinition: PipelineProcessorsUiDefinition;
  fields?: FieldDefinition;
  configurationMode: ConfigurationMode;
}

export function createUpsertStreamActor({
  telemetryClient,
}: Pick<StreamEnrichmentServiceDependencies, 'telemetryClient'>) {
  return fromPromise<UpsertStreamResponse, UpsertStreamInput>(async ({ input, signal }) => {
    const nextPipeline = await input.processingPersistenceAdapter.saveProcessing({
      ...input,
      signal,
    });
    const processors = nextPipeline.processors ?? [];

    telemetryClient.trackProcessingSaved({
      processors_count: processors.length,
      stream_type: getStreamTypeFromDefinition(input.definition.stream),
      configuration_mode: input.configurationMode,
    });

    return nextPipeline;
  });
}

export const createUpsertStreamSuccessNofitier =
  ({ toasts }: { toasts: IToasts }) =>
  () => {
    toasts.addSuccess(
      i18n.translate('xpack.streams.streamDetailView.managementTab.enrichment.saveChangesSuccess', {
        defaultMessage: "Stream's processors updated",
      })
    );
  };

export const createUpsertStreamFailureNofitier =
  ({ toasts }: { toasts: IToasts }) =>
  (params: { event: unknown }) => {
    const event = params.event as ErrorActorEvent<esErrors.ResponseError, string>;
    const formattedError = getFormattedError(event.error);
    toasts.addError(formattedError, {
      title: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.saveChangesError',
        { defaultMessage: "An issue occurred saving processors' changes." }
      ),
      toastMessage: formattedError.message,
    });
  };
