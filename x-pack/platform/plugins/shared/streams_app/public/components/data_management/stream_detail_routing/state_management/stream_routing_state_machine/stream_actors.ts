/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { errors as esErrors } from '@elastic/elasticsearch';
import type { IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { Condition } from '@kbn/streamlang';
import type { APIReturnType } from '@kbn/streams-plugin/public/api';
import type { RoutingDefinition, RoutingStatus, Streams } from '@kbn/streams-schema';
import type { ErrorActorEvent } from 'xstate';
import { fromPromise } from 'xstate';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
import { getFormattedError } from '../../../../../util/errors';
import { buildRoutingForkRequestPayload, buildRoutingSaveRequestPayload } from '../../utils';
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
    const body = buildRoutingSaveRequestPayload(input.definition, input.routing);

    return streamsRepositoryClient.fetch(`PUT /api/streams/{name}/_ingest 2023-10-31`, {
      signal,
      params: {
        path: {
          name: input.definition.stream.name,
        },
        body,
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
  telemetryClient,
}: Pick<StreamRoutingServiceDependencies, 'streamsRepositoryClient'> & {
  forkSuccessNofitier: (streamName: string) => void;
  telemetryClient: StreamsTelemetryClient;
}) {
  return fromPromise<ForkStreamResponse, ForkStreamInput>(async ({ input, signal }) => {
    const body = buildRoutingForkRequestPayload({
      where: input.where,
      status: input.status,
      destination: input.destination,
    });

    const response = await streamsRepositoryClient.fetch(
      'POST /api/streams/{name}/_fork 2023-10-31',
      {
        signal,
        params: {
          path: {
            name: input.definition.stream.name,
          },
          body,
        },
      }
    );

    forkSuccessNofitier(input.destination);
    telemetryClient.trackChildStreamCreated({
      name: input.destination,
    });

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
 * Create query stream actor factory
 * This actor is used to create a new query stream
 */
export type CreateQueryStreamResponse = APIReturnType<'PUT /api/streams/{name}/_query 2023-10-31'>;
export interface CreateQueryStreamInput {
  name: string;
  esqlQuery: string;
}

export function createQueryStreamActor({
  streamsRepositoryClient,
}: Pick<StreamRoutingServiceDependencies, 'streamsRepositoryClient'>) {
  return fromPromise<CreateQueryStreamResponse, CreateQueryStreamInput>(({ input, signal }) => {
    return streamsRepositoryClient.fetch('PUT /api/streams/{name}/_query 2023-10-31', {
      signal,
      params: {
        path: {
          name: input.name,
        },
        body: {
          query: {
            esql: input.esqlQuery,
          },
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

export const createQueryStreamSuccessNotifier =
  ({ toasts }: { toasts: IToasts }) =>
  () => {
    toasts.addSuccess({
      title: i18n.translate('xpack.streams.streamDetailRouting.queryStreamCreated', {
        defaultMessage: 'Query stream created',
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
