import type { ElasticsearchServiceStart, KibanaRequest, Logger, SecurityServiceStart } from '@kbn/core/server';
import type { AgentCreateRequest, AgentDeleteRequest, AgentListOptions, AgentUpdateRequest } from '../../../../../common/agents';
import type { ToolsServiceStart } from '../../../tools';
import type { AgentsUsingToolsResult, PersistedAgentDefinition } from '../types';
export interface AgentClient {
    has(agentId: string): Promise<boolean>;
    get(agentId: string): Promise<PersistedAgentDefinition>;
    create(profile: AgentCreateRequest): Promise<PersistedAgentDefinition>;
    ensureDefaultAgent(profile: AgentCreateRequest): Promise<PersistedAgentDefinition>;
    update(agentId: string, profile: AgentUpdateRequest): Promise<PersistedAgentDefinition>;
    list(options?: AgentListOptions): Promise<PersistedAgentDefinition[]>;
    delete(options: AgentDeleteRequest): Promise<boolean>;
    getAgentsUsingTools(params: {
        toolIds: string[];
    }): Promise<AgentsUsingToolsResult>;
    removeToolRefsFromAgents(params: {
        toolIds: string[];
    }): Promise<AgentsUsingToolsResult>;
}
export declare const createClient: ({ space, request, elasticsearch, security, toolsService, logger, }: {
    space: string;
    request: KibanaRequest;
    security: SecurityServiceStart;
    elasticsearch: ElasticsearchServiceStart;
    toolsService: ToolsServiceStart;
    logger: Logger;
}) => Promise<AgentClient>;
