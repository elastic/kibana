import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type PersistedSkillCreateRequest, type PersistedSkillUpdateRequest } from '@kbn/agent-builder-common';
import type { SkillPersistedDefinition, SkillListOptions } from './types';
/**
 * Client for persisted skill definitions.
 */
export interface SkillClient {
    get(skillId: string): Promise<SkillPersistedDefinition>;
    list(options?: SkillListOptions): Promise<SkillPersistedDefinition[]>;
    create(request: PersistedSkillCreateRequest): Promise<SkillPersistedDefinition>;
    update(skillId: string, updates: PersistedSkillUpdateRequest): Promise<SkillPersistedDefinition>;
    /**
     * Deletes a skill. Throws if the skill does not exist or is plugin-managed.
     */
    delete(skillId: string): Promise<void>;
    /**
     * Creates multiple skills in a single bulk request.
     * Optimized for plugin installation where IDs are deterministic.
     * Does not perform per-skill uniqueness checks.
     */
    bulkCreate(requests: PersistedSkillCreateRequest[]): Promise<SkillPersistedDefinition[]>;
    /**
     * Deletes all skills associated with the given plugin.
     */
    deleteByPluginId(pluginId: string): Promise<void>;
    /**
     * Fetches multiple skills by ID in a single ES query.
     * Silently omits skills that are not found.
     */
    bulkGet(ids: string[]): Promise<SkillPersistedDefinition[]>;
    has(skillId: string): Promise<boolean>;
}
export declare const createClient: ({ space, logger, esClient, }: {
    space: string;
    logger: Logger;
    esClient: ElasticsearchClient;
}) => SkillClient;
