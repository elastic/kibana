import type { Observable } from 'rxjs';
import type { IClusterClient, PluginInitializerContext } from '@kbn/core/server';
import type { Plugin } from './plugin';
import type { EsContext } from './es';
import type { IEvent, IEventLogger, IEventLogService, IEventLogConfig } from './types';
import type { SavedObjectProvider, SavedObjectProviderRegistry } from './saved_object_provider_registry';
export type PluginClusterClient = Pick<IClusterClient, 'asInternalUser'>;
export type AdminClusterClient$ = Observable<PluginClusterClient>;
type SystemLogger = Plugin['systemLogger'];
interface EventLogServiceCtorParams {
    config: IEventLogConfig;
    esContext: EsContext;
    kibanaUUID: string;
    systemLogger: SystemLogger;
    savedObjectProviderRegistry: SavedObjectProviderRegistry;
    kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
}
export declare class EventLogService implements IEventLogService {
    private config;
    private esContext;
    private systemLogger;
    private registeredProviderActions;
    private savedObjectProviderRegistry;
    readonly kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
    readonly kibanaUUID: string;
    constructor({ config, esContext, kibanaUUID, systemLogger, savedObjectProviderRegistry, kibanaVersion, }: EventLogServiceCtorParams);
    isLoggingEntries(): boolean;
    isIndexingEntries(): boolean;
    registerProviderActions(provider: string, actions: string[]): void;
    isProviderActionRegistered(provider: string, action: string): boolean;
    getProviderActions(): Map<string, Set<string>>;
    registerSavedObjectProvider(type: string, provider: SavedObjectProvider): void;
    isEsContextReady(): Promise<boolean>;
    getIndexPattern(): string;
    getLogger(initialProperties: IEvent): IEventLogger;
}
export {};
