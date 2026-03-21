import type { KibanaRequest, Logger, ElasticsearchServiceStart } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { AgentBuilderConfig } from '../../config';
import type { PluginClient, PersistedPluginDefinition } from './client';
type InstallPluginSource = {
    type: 'url';
    url: string;
} | {
    type: 'file';
    filePath: string;
};
export interface PluginsServiceSetup {
}
export interface PluginsServiceStart {
    getScopedClient(options: {
        request: KibanaRequest;
    }): PluginClient;
    installPlugin(options: {
        request: KibanaRequest;
        source: InstallPluginSource;
        pluginName?: string;
    }): Promise<PersistedPluginDefinition>;
    deletePlugin(options: {
        request: KibanaRequest;
        pluginId: string;
    }): Promise<void>;
}
export interface PluginsService {
    setup(): PluginsServiceSetup;
    start(deps: PluginsServiceStartDeps): PluginsServiceStart;
}
export interface PluginsServiceStartDeps {
    logger: Logger;
    elasticsearch: ElasticsearchServiceStart;
    spaces?: SpacesPluginStart;
    config: AgentBuilderConfig;
}
export declare const createPluginsService: () => PluginsService;
export {};
