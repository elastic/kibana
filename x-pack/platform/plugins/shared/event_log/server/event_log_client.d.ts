import type { Observable } from 'rxjs';
import type { TypeOf } from '@kbn/config-schema';
import type { IClusterClient, KibanaRequest } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { KueryNode } from '@kbn/es-query';
import type { EsContext } from './es';
import type { IEventLogClient } from './types';
import type { QueryEventsBySavedObjectResult, QueryEventsBySavedObjectSearchAfterResult } from './es/cluster_client_adapter';
import type { SavedObjectBulkGetterResult } from './saved_object_provider_registry';
export type PluginClusterClient = Pick<IClusterClient, 'asInternalUser'>;
export type AdminClusterClient$ = Observable<PluginClusterClient>;
export declare const queryOptionsSchema: import("@kbn/config-schema").ObjectType<{
    per_page: import("@kbn/config-schema").Type<number>;
    page: import("@kbn/config-schema").Type<number>;
    start: import("@kbn/config-schema").Type<string | undefined>;
    end: import("@kbn/config-schema").Type<string | undefined>;
    sort: import("@kbn/config-schema").Type<{
        sort_field: string;
        sort_order: string;
    }[]>;
    filter: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const queryOptionsSearchAfterSchema: import("@kbn/config-schema").ObjectType<{
    per_page: import("@kbn/config-schema").Type<number>;
    pit_id: import("@kbn/config-schema").Type<string | undefined>;
    search_after: import("@kbn/config-schema").Type<any[] | undefined>;
    start: import("@kbn/config-schema").Type<string | undefined>;
    end: import("@kbn/config-schema").Type<string | undefined>;
    sort: import("@kbn/config-schema").Type<{
        sort_field: string;
        sort_order: string;
    }[]>;
    filter: import("@kbn/config-schema").Type<string | undefined>;
}>;
export type QueryOptionsType = Pick<TypeOf<typeof queryOptionsSchema>, 'start' | 'end' | 'filter'>;
export type FindOptionsType = Pick<TypeOf<typeof queryOptionsSchema>, 'page' | 'per_page' | 'sort' | 'filter'> & Partial<TypeOf<typeof queryOptionsSchema>>;
export type AggregateOptionsType = Pick<TypeOf<typeof queryOptionsSchema>, 'filter'> & Partial<TypeOf<typeof queryOptionsSchema>> & {
    aggs: Record<string, estypes.AggregationsAggregationContainer>;
};
export type FindOptionsSearchAfterType = Omit<FindOptionsType, 'page'> & {
    pit_id?: string;
    search_after?: estypes.SortResults;
};
interface EventLogServiceCtorParams {
    esContext: EsContext;
    savedObjectGetter: SavedObjectBulkGetterResult;
    spacesService?: SpacesServiceStart;
    request: KibanaRequest;
    spaceId?: string;
}
export declare class EventLogClient implements IEventLogClient {
    private esContext;
    private savedObjectGetter;
    private spacesService?;
    private request;
    private spaceId?;
    constructor({ esContext, savedObjectGetter, spacesService, request, spaceId, }: EventLogServiceCtorParams);
    findEventsBySavedObjectIds(type: string, ids: string[], options?: Partial<FindOptionsType>, legacyIds?: string[]): Promise<QueryEventsBySavedObjectResult>;
    findEventsWithAuthFilter(type: string, ids: string[], authFilter: KueryNode, namespace: string | undefined, options?: Partial<FindOptionsType>): Promise<QueryEventsBySavedObjectResult>;
    findEventsByDocumentIds(docs: Array<{
        _id: string;
        _index: string;
    }>): Promise<Pick<QueryEventsBySavedObjectResult, 'data'>>;
    aggregateEventsBySavedObjectIds(type: string, ids: string[], options?: AggregateOptionsType, legacyIds?: string[]): Promise<import("./types").AggregateEventsBySavedObjectResult>;
    aggregateEventsWithAuthFilter(type: string, authFilter: KueryNode, options?: AggregateOptionsType, namespaces?: Array<string | undefined>, includeSpaceAgnostic?: boolean): Promise<import("./types").AggregateEventsBySavedObjectResult>;
    refreshIndex(): Promise<void>;
    findEventsBySavedObjectIdsSearchAfter(type: string, ids: string[], options?: Partial<FindOptionsSearchAfterType>, legacyIds?: string[]): Promise<QueryEventsBySavedObjectSearchAfterResult>;
    closePointInTime(pitId: string): Promise<void>;
    private getNamespace;
}
export {};
