import type { PluginDefinition } from '@kbn/agent-builder-common';
import type { PluginCreateRequest, PluginUpdateRequest } from './crud';
export interface PluginRegistry {
    has(pluginId: string): Promise<boolean>;
    get(pluginId: string): Promise<PluginDefinition>;
    findByName(name: string): Promise<PluginDefinition | undefined>;
    list(): Promise<PluginDefinition[]>;
    create(request: PluginCreateRequest): Promise<PluginDefinition>;
    update(pluginId: string, update: PluginUpdateRequest): Promise<PluginDefinition>;
    delete(pluginId: string): Promise<void>;
}
