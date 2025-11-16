/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinition } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import type { ErrorActorEvent } from 'xstate5';
import { fromPromise } from 'xstate5';
import type { errors as esErrors } from '@elastic/elasticsearch';
import type { APIReturnType } from '@kbn/streams-plugin/public/api';
import type { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { StreamlangDSL } from '@kbn/streamlang';
import { getProcessorsCount, stripCustomIdentifiers } from '@kbn/streamlang';
import { getStreamTypeFromDefinition } from '../../../../../util/get_stream_type_from_definition';
import { getFormattedError } from '../../../../../util/errors';
import type { StreamEnrichmentServiceDependencies } from './types';

export type UpsertStreamResponse = APIReturnType<'PUT /api/streams/{name}/_ingest 2023-10-31'>;

export interface UpsertStreamInput {
  definition: Streams.ingest.all.GetResponse;
  streamlangDSL: StreamlangDSL;
  fields?: FieldDefinition;
}

export function createUpsertStreamActor({
  streamsRepositoryClient,
  telemetryClient,
}: Pick<StreamEnrichmentServiceDependencies, 'streamsRepositoryClient' | 'telemetryClient'>) {
  return fromPromise<UpsertStreamResponse, UpsertStreamInput>(async ({ input, signal }) => {
    const response = await streamsRepositoryClient.fetch(
      `PUT /api/streams/{name}/_ingest 2023-10-31`,
      {
        signal,
        params: {
          path: {
            name: input.definition.stream.name,
          },
          body: Streams.WiredStream.GetResponse.is(input.definition)
            ? {
                ingest: {
                  ...input.definition.stream.ingest,
                  processing: stripCustomIdentifiers(input.streamlangDSL),
                  ...(input.fields && {
                    wired: { ...input.definition.stream.ingest.wired, fields: input.fields },
                  }),
                },
              }
            : {
                ingest: {
                  ...input.definition.stream.ingest,
                  processing: stripCustomIdentifiers(input.streamlangDSL),
                  ...(input.fields && {
                    classic: {
                      ...input.definition.stream.ingest.classic,
                      field_overrides: input.fields,
                    },
                  }),
                },
              },
        },
      }
    );

    const processorsCount = getProcessorsCount(input.streamlangDSL);

    telemetryClient.trackProcessingSaved({
      processors_count: processorsCount,
      stream_type: getStreamTypeFromDefinition(input.definition.stream),
    });

    return response;
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
