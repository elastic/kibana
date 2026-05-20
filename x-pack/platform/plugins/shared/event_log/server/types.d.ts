import type { TypeOf } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import type { KueryNode } from '@kbn/es-query';
export type { IEvent, IValidatedEvent } from '../generated/schemas';
export { EventSchema, ECS_VERSION } from '../generated/schemas';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IEvent } from '../generated/schemas';
import type { AggregateOptionsType, FindOptionsType, FindOptionsSearchAfterType } from './event_log_client';
import type { AggregateEventsBySavedObjectResult, QueryEventsBySavedObjectResult, InternalFields, QueryEventsBySavedObjectSearchAfterResult } from './es/cluster_client_adapter';
export type { QueryEventsBySavedObjectResult, AggregateEventsBySavedObjectResult, InternalFields, IValidatedEventInternalDocInfo, } from './es/cluster_client_adapter';
import type { SavedObjectProvider } from './saved_object_provider_registry';
export declare const SAVED_OBJECT_REL_PRIMARY = "primary";
export declare const ConfigSchema: import("@kbn/config-schema").ObjectType<{
    logEntries: import("@kbn/config-schema").Type<boolean>;
    indexEntries: import("@kbn/config-schema").Type<boolean>;
}>;
export type IEventLogConfig = TypeOf<typeof ConfigSchema>;
export interface IEventLogService {
    isLoggingEntries(): boolean;
    isIndexingEntries(): boolean;
    registerProviderActions(provider: string, actions: string[]): void;
    isProviderActionRegistered(provider: string, action: string): boolean;
    getProviderActions(): Map<string, Set<string>>;
    registerSavedObjectProvider(type: string, provider: SavedObjectProvider): void;
    getLogger(properties: IEvent): IEventLogger;
    getIndexPattern(): string;
    isEsContextReady(): Promise<boolean>;
}
export interface IEventLogClientService {
    getClient(request: KibanaRequest): IEventLogClient;
    getClientWithRequestInSpace(request: KibanaRequest, spaceId: string): IEventLogClient;
}
export interface IEventLogClient {
    findEventsBySavedObjectIds(type: string, ids: string[], options?: Partial<FindOptionsType>, legacyIds?: string[]): Promise<QueryEventsBySavedObjectResult>;
    findEventsWithAuthFilter(type: string, ids: string[], authFilter: KueryNode, namespace: string | undefined, options?: Partial<FindOptionsType>): Promise<QueryEventsBySavedObjectResult>;
    aggregateEventsBySavedObjectIds(type: string, ids: string[], options?: Partial<AggregateOptionsType>, legacyIds?: string[]): Promise<AggregateEventsBySavedObjectResult>;
    aggregateEventsWithAuthFilter(type: string, authFilter: KueryNode, options?: Partial<AggregateOptionsType>, namespaces?: Array<string | undefined>, includeSpaceAgnostic?: boolean): Promise<AggregateEventsBySavedObjectResult>;
    findEventsByDocumentIds(docs: Array<{
        _id: string;
        _index: string;
    }>): Promise<Pick<QueryEventsBySavedObjectResult, 'data'>>;
    findEventsBySavedObjectIdsSearchAfter(type: string, ids: string[], options?: Partial<FindOptionsSearchAfterType>, legacyIds?: string[]): Promise<QueryEventsBySavedObjectSearchAfterResult>;
    closePointInTime(pitId: string): Promise<void>;
    refreshIndex(): Promise<void>;
}
export interface IEventLogger {
    logEvent(properties: IEvent, id?: string): void;
    startTiming(event: IEvent, startTime?: Date): void;
    stopTiming(event: IEvent): void;
    updateEvents(events: Array<{
        internalFields: InternalFields;
        event: IEvent;
    }>): Promise<BulkResponse>;
}
