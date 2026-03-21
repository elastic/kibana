import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { PersistedPluginDefinition, PluginCreateRequest, PluginUpdateRequest } from './types';
export interface PluginClient {
    get(pluginId: string): Promise<PersistedPluginDefinition>;
    list(): Promise<PersistedPluginDefinition[]>;
    has(pluginId: string): Promise<boolean>;
    findByName(name: string): Promise<PersistedPluginDefinition | undefined>;
    create(request: PluginCreateRequest): Promise<PersistedPluginDefinition>;
    update(pluginId: string, updates: PluginUpdateRequest): Promise<PersistedPluginDefinition>;
    delete(pluginId: string): Promise<void>;
}
export declare const createClient: ({ space, logger, esClient, }: {
    space: string;
    logger: Logger;
    esClient: ElasticsearchClient;
}) => PluginClient;
