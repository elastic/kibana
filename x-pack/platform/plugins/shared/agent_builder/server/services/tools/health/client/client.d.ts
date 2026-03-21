import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ToolHealthState, ToolHealthUpdateParams } from './types';
/**
 * Client for managing tool health state.
 *
 * Note: This client is primarily used in fire-and-forget mode from the tool registry.
 * Errors are caught and wrapped with context for debugging, but callers using
 * fire-and-forget patterns should catch and ignore errors to avoid blocking tool execution.
 */
export interface ToolHealthClient {
    /**
     * Get health state for a specific tool.
     */
    get(toolId: string): Promise<ToolHealthState | undefined>;
    /**
     * Create or update health state for a tool.
     */
    upsert(toolId: string, params: ToolHealthUpdateParams): Promise<ToolHealthState>;
    /**
     * Delete health state for a tool.
     * Returns true if deleted, false if not found or on error.
     * This method is designed for fire-and-forget cleanup and will not throw.
     */
    delete(toolId: string): Promise<boolean>;
    /**
     * List all health states for the current space.
     */
    listBySpace(): Promise<ToolHealthState[]>;
    /**
     * Record a successful health check for a tool.
     */
    recordSuccess(toolId: string): Promise<ToolHealthState>;
    /**
     * Record a failed health check for a tool.
     */
    recordFailure(toolId: string, errorMessage: string): Promise<ToolHealthState>;
}
export declare const createClient: ({ space, logger, esClient, }: {
    space: string;
    logger: Logger;
    esClient: ElasticsearchClient;
}) => ToolHealthClient;
