/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDefinition, Streams } from '@kbn/streams-schema';
import { ErrorActorEvent, fromPromise } from 'xstate5';
import { errors as esErrors } from '@elastic/elasticsearch';
import { APIReturnType } from '@kbn/streams-plugin/public/api';
import { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { StreamEnrichmentServiceDependencies } from './types';
import { processorConverter } from '../../utils';
import { ProcessorDefinitionWithUIAttributes } from '../../types';

export type UpsertStreamResponse = APIReturnType<'PUT /api/streams/{name}/_ingest 2023-10-31'>;

export interface UpsertStreamInput {
  definition: Streams.ingest.all.GetResponse;
  processors: ProcessorDefinitionWithUIAttributes[];
  fields?: FieldDefinition;
}

export function createUpsertStreamActor({
  streamsRepositoryClient,
}: Pick<StreamEnrichmentServiceDependencies, 'streamsRepositoryClient'>) {
  return fromPromise<UpsertStreamResponse, UpsertStreamInput>(({ input, signal }) => {
    return streamsRepositoryClient.fetch(`PUT /api/streams/{name}/_ingest 2023-10-31`, {
      signal,
      params: {
        path: {
          name: input.definition.stream.name,
        },
        body: Streams.WiredStream.GetResponse.is(input.definition)
          ? {
              ingest: {
                ...input.definition.stream.ingest,
                processing: input.processors.map(processorConverter.toAPIDefinition),
                ...(input.fields && {
                  wired: { ...input.definition.stream.ingest.wired, fields: input.fields },
                }),
              },
            }
          : {
              ingest: {
                ...input.definition.stream.ingest,
                processing: input.processors.map(processorConverter.toAPIDefinition),
              },
            },
      },
    });
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
    toasts.addError(new Error(event.error.body.message), {
      title: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.saveChangesError',
        { defaultMessage: "An issue occurred saving processors' changes." }
      ),
      toastMessage: event.error.body.message,
    });
  };
