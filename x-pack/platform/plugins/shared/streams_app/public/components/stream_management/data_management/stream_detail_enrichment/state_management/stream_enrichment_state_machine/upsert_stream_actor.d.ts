import type { IToasts } from '@kbn/core/public';
import type { StreamlangDSL } from '@kbn/streamlang';
import type { APIReturnType } from '@kbn/streams-plugin/public/api';
import type { FieldDefinition, Streams } from '@kbn/streams-schema';
import type { ConfigurationMode } from '../../../../../telemetry/types';
import type { StreamEnrichmentServiceDependencies } from './types';
export type UpsertStreamResponse = APIReturnType<'PUT /api/streams/{name}/_ingest 2023-10-31'>;
export interface UpsertStreamInput {
    definition: Streams.ingest.all.GetResponse;
    streamlangDSL: StreamlangDSL;
    fields?: FieldDefinition;
    configurationMode: ConfigurationMode;
}
export declare function createUpsertStreamActor({ streamsRepositoryClient, telemetryClient, }: Pick<StreamEnrichmentServiceDependencies, 'streamsRepositoryClient' | 'telemetryClient'>): import("xstate").PromiseActorLogic<import("../../../../../../../streams/server/lib/streams/client").UpsertStreamResponse, UpsertStreamInput, import("xstate").EventObject>;
export declare const createUpsertStreamSuccessNofitier: ({ toasts }: {
    toasts: IToasts;
}) => () => void;
export declare const createUpsertStreamFailureNofitier: ({ toasts }: {
    toasts: IToasts;
}) => (params: {
    event: unknown;
}) => void;
