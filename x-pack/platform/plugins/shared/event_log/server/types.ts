/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { KibanaRequest } from '@kbn/core/server';
import { KueryNode } from '@kbn/es-query';

export type { IEvent, IValidatedEvent } from '../generated/schemas';
export { EventSchema, ECS_VERSION } from '../generated/schemas';
import { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { IEvent } from '../generated/schemas';
import { AggregateOptionsType, FindOptionsType } from './event_log_client';
import {
  AggregateEventsBySavedObjectResult,
  QueryEventsBySavedObjectResult,
  InternalFields,
} from './es/cluster_client_adapter';

export type {
  QueryEventsBySavedObjectResult,
  AggregateEventsBySavedObjectResult,
  InternalFields,
  IValidatedEventInternalDocInfo,
} from './es/cluster_client_adapter';
import { SavedObjectProvider } from './saved_object_provider_registry';

export const SAVED_OBJECT_REL_PRIMARY = 'primary';

export const ConfigSchema = schema.object({
  logEntries: schema.boolean({ defaultValue: false }),
  indexEntries: schema.boolean({ defaultValue: true }),
});

export type IEventLogConfig = TypeOf<typeof ConfigSchema>;

// the object exposed by plugin.setup()
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
}

export interface IEventLogClient {
  findEventsBySavedObjectIds(
    type: string,
    ids: string[],
    options?: Partial<FindOptionsType>,
    legacyIds?: string[]
  ): Promise<QueryEventsBySavedObjectResult>;
  findEventsWithAuthFilter(
    type: string,
    ids: string[],
    authFilter: KueryNode,
    namespace: string | undefined,
    options?: Partial<FindOptionsType>
  ): Promise<QueryEventsBySavedObjectResult>;
  aggregateEventsBySavedObjectIds(
    type: string,
    ids: string[],
    options?: Partial<AggregateOptionsType>,
    legacyIds?: string[]
  ): Promise<AggregateEventsBySavedObjectResult>;
  aggregateEventsWithAuthFilter(
    type: string,
    authFilter: KueryNode,
    options?: Partial<AggregateOptionsType>,
    namespaces?: Array<string | undefined>,
    includeSpaceAgnostic?: boolean
  ): Promise<AggregateEventsBySavedObjectResult>;
  findEventsByDocumentIds(
    docs: Array<{ _id: string; _index: string }>
  ): Promise<Pick<QueryEventsBySavedObjectResult, 'data'>>;
  refreshIndex(): Promise<void>;
}

export interface IEventLogger {
  logEvent(properties: IEvent): void;
  startTiming(event: IEvent, startTime?: Date): void;
  stopTiming(event: IEvent): void;
  updateEvents(
    events: Array<{ internalFields: InternalFields; event: IEvent }>
  ): Promise<BulkResponse>;
}
