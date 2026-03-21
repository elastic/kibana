import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ToolCreateParams } from '@kbn/agent-builder-server';
import type { ToolTypeUpdateParams, ToolProviderListFilters } from '../../tool_provider';
import type { ToolPersistedDefinition } from './types';
/**
 * Client for persisted tool definitions.
 */
export interface ToolClient {
    get(toolId: string): Promise<ToolPersistedDefinition>;
    list(filters?: ToolProviderListFilters): Promise<ToolPersistedDefinition[]>;
    create(esqlTool: ToolCreateParams): Promise<ToolPersistedDefinition>;
    update(toolId: string, updates: ToolTypeUpdateParams): Promise<ToolPersistedDefinition>;
    delete(toolId: string): Promise<boolean>;
}
export declare const createClient: ({ space, logger, esClient, }: {
    space: string;
    logger: Logger;
    esClient: ElasticsearchClient;
}) => ToolClient;
