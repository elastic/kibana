import type { IToasts } from '@kbn/core/public';
import type { Condition } from '@kbn/streamlang';
import type { APIReturnType } from '@kbn/streams-plugin/public/api';
import type { RoutingDefinition, RoutingStatus, Streams } from '@kbn/streams-schema';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
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
export declare function createUpsertStreamActor({ streamsRepositoryClient, }: Pick<StreamRoutingServiceDependencies, 'streamsRepositoryClient'>): import("xstate").PromiseActorLogic<import("../../../../../../../streams/server/lib/streams/client").UpsertStreamResponse, UpsertStreamInput, import("xstate").EventObject>;
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
export declare function createForkStreamActor({ streamsRepositoryClient, forkSuccessNofitier, telemetryClient, }: Pick<StreamRoutingServiceDependencies, 'streamsRepositoryClient'> & {
    forkSuccessNofitier: (streamName: string) => void;
    telemetryClient: StreamsTelemetryClient;
}): import("xstate").PromiseActorLogic<{
    acknowledged: true;
}, ForkStreamInput, import("xstate").EventObject>;
/**
 * Delete stream actor factory
 * This actor is used to fork a stream, creating a new stream with the same definition
 */
export type DeleteStreamResponse = APIReturnType<'DELETE /api/streams/{name} 2023-10-31'>;
export interface DeleteStreamInput {
    name: string;
}
export declare function createDeleteStreamActor({ streamsRepositoryClient, }: Pick<StreamRoutingServiceDependencies, 'streamsRepositoryClient'>): import("xstate").PromiseActorLogic<{
    acknowledged: true;
}, DeleteStreamInput, import("xstate").EventObject>;
/**
 * Create query stream actor factory
 * This actor is used to create a new query stream
 */
export type CreateQueryStreamResponse = APIReturnType<'PUT /api/streams/{name}/_query 2023-10-31'>;
export interface CreateQueryStreamInput {
    name: string;
    esqlQuery: string;
}
export declare function createQueryStreamActor({ streamsRepositoryClient, }: Pick<StreamRoutingServiceDependencies, 'streamsRepositoryClient'>): import("xstate").PromiseActorLogic<import("../../../../../../../streams/server/lib/streams/client").UpsertStreamResponse, CreateQueryStreamInput, import("xstate").EventObject>;
/**
 * Notifier factories
 */
export declare const createStreamSuccessNofitier: ({ toasts }: {
    toasts: IToasts;
}) => () => void;
export declare const createQueryStreamSuccessNotifier: ({ toasts }: {
    toasts: IToasts;
}) => () => void;
export declare const createStreamFailureNofitier: ({ toasts }: {
    toasts: IToasts;
}) => (params: {
    event: unknown;
}) => void;
