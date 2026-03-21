import type { Observable } from 'rxjs';
import type { IClusterClient, KibanaRequest } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { EsContext } from './es';
import type { IEventLogClientService } from './types';
import { EventLogClient } from './event_log_client';
import type { SavedObjectProviderRegistry } from './saved_object_provider_registry';
export type PluginClusterClient = Pick<IClusterClient, 'asInternalUser'>;
export type AdminClusterClient$ = Observable<PluginClusterClient>;
interface EventLogServiceCtorParams {
    esContext: EsContext;
    savedObjectProviderRegistry: SavedObjectProviderRegistry;
    spacesService?: SpacesServiceStart;
}
export declare class EventLogClientService implements IEventLogClientService {
    private esContext;
    private savedObjectProviderRegistry;
    private spacesService?;
    constructor({ esContext, savedObjectProviderRegistry, spacesService, }: EventLogServiceCtorParams);
    getClient(request: KibanaRequest): EventLogClient;
    getClientWithRequestInSpace(request: KibanaRequest, spaceId: string): EventLogClient;
}
export {};
