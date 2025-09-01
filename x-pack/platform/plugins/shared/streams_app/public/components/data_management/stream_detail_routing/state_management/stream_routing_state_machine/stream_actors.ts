/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoutingDefinition, RoutingStatus, Streams } from '@kbn/streams-schema';
import type { ErrorActorEvent } from 'xstate5';
import { fromPromise } from 'xstate5';
import type { errors as esErrors } from '@elastic/elasticsearch';
import type { APIReturnType } from '@kbn/streams-plugin/public/api';
import type { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { Condition } from '@kbn/streamlang';
import { getFormattedError } from '../../../../../util/errors';
import type { StreamRoutingServiceDependencies } from './types';

/**
 * Upsert stream actor factory
 * This actor is used to update the routing of a stream
 */
export type UpsertStreamResponse = APIReturnType<'PUT /api/streams/{name}/_ingest 2023-10-31'>;
export interface UpsertStreamInput {
  definition: Streams.WiredStream.GetResponse;
  routing: RoutingDefinition[];
}

export function createUpsertStreamActor({
  streamsRepositoryClient,
}: Pick<StreamRoutingServiceDependencies, 'streamsRepositoryClient'>) {
  return fromPromise<UpsertStreamResponse, UpsertStreamInput>(({ input, signal }) => {
    return streamsRepositoryClient.fetch(`PUT /api/streams/{name}/_ingest 2023-10-31`, {
      signal,
      params: {
        path: {
          name: input.definition.stream.name,
        },
        body: {
          ingest: {
            ...input.definition.stream.ingest,
            wired: {
              ...input.definition.stream.ingest.wired,
              routing: input.routing,
            },
          },
        },
      },
    });
  });
}

/**
 * Fork stream actor factory
 * This actor is used to fork a stream, creating a new stream with the same definition
 */
export type ForkStreamResponse = APIReturnType<'POST /api/streams/{name}/_fork 2023-10-31'>;
export interface ForkStreamInput {
  definition: Streams.WiredStream.GetResponse;
  where: Condition;
  status: RoutingStatus;
  destination: string;
}
export function createForkStreamActor({
  streamsRepositoryClient,
  forkSuccessNofitier,
}: Pick<StreamRoutingServiceDependencies, 'streamsRepositoryClient'> & {
  forkSuccessNofitier: (streamName: string) => void;
}) {
  return fromPromise<ForkStreamResponse, ForkStreamInput>(async ({ input, signal }) => {
    const response = await streamsRepositoryClient.fetch(
      'POST /api/streams/{name}/_fork 2023-10-31',
      {
        signal,
        params: {
          path: {
            name: input.definition.stream.name,
          },
          body: {
            where: input.where,
            status: input.status,
            stream: {
              name: input.destination,
            },
          },
        },
      }
    );

    forkSuccessNofitier(input.destination);

    return response;
  });
}

/**
 * Delete stream actor factory
 * This actor is used to fork a stream, creating a new stream with the same definition
 */
export type DeleteStreamResponse = APIReturnType<'DELETE /api/streams/{name} 2023-10-31'>;
export interface DeleteStreamInput {
  name: string;
}

export function createDeleteStreamActor({
  streamsRepositoryClient,
}: Pick<StreamRoutingServiceDependencies, 'streamsRepositoryClient'>) {
  return fromPromise<DeleteStreamResponse, DeleteStreamInput>(({ input, signal }) => {
    return streamsRepositoryClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
      signal,
      params: {
        path: {
          name: input.name,
        },
      },
    });
  });
}

/**
 * Notifier factories
 */

export const createStreamSuccessNofitier =
  ({ toasts }: { toasts: IToasts }) =>
  () => {
    toasts.addSuccess({
      title: i18n.translate('xpack.streams.streamDetailRouting.saved', {
        defaultMessage: 'Stream saved',
      }),
      toastLifeTimeMs: 3000,
    });
  };

export const createStreamFailureNofitier =
  ({ toasts }: { toasts: IToasts }) =>
  (params: { event: unknown }) => {
    const event = params.event as ErrorActorEvent<esErrors.ResponseError, string>;
    const formattedError = getFormattedError(event.error);
    toasts.addError(formattedError, {
      title: i18n.translate('xpack.streams.failedToSave', {
        defaultMessage: 'Failed to save',
      }),
      toastMessage: formattedError.message,
      toastLifeTimeMs: 5000,
    });
  };
