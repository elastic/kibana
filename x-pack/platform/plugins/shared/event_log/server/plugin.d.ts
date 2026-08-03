import type { CoreSetup, CoreStart, Plugin as CorePlugin, PluginInitializerContext, IClusterClient } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { ServerlessPluginSetup } from '@kbn/serverless/server';
import type { IEventLogService, IEventLogClientService } from './types';
export type PluginClusterClient = Pick<IClusterClient, 'asInternalUser'>;
interface PluginSetupDeps {
    serverless?: ServerlessPluginSetup;
}
interface PluginStartDeps {
    spaces?: SpacesPluginStart;
}
export declare class Plugin implements CorePlugin<IEventLogService, IEventLogClientService> {
    private readonly context;
    private readonly config;
    private systemLogger;
    private eventLogService?;
    private esContext?;
    private eventLogger?;
    private eventLogClientService?;
    private savedObjectProviderRegistry;
    private kibanaVersion;
    constructor(context: PluginInitializerContext);
    setup(core: CoreSetup, plugins: PluginSetupDeps): IEventLogService;
    start(core: CoreStart, { spaces }: PluginStartDeps): IEventLogClientService;
    stop(): Promise<void>;
}
export {};
