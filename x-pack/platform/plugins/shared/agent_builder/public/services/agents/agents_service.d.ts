import type { HttpSetup } from '@kbn/core-http-browser';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { AgentCreateRequest, AgentListOptions, AgentUpdateRequest } from '../../../common/agents';
import type { DeleteAgentResponse } from '../../../common/http_api/agents';
export declare class AgentService {
    private readonly http;
    constructor({ http }: {
        http: HttpSetup;
    });
    /**
     * List all agents
     */
    list(options?: AgentListOptions): Promise<AgentDefinition[]>;
    /**
     * Get a single agent by id
     */
    get(id: string): Promise<AgentDefinition>;
    /**
     * Create a new agent
     */
    create(profile: AgentCreateRequest): Promise<AgentDefinition>;
    /**
     * Update an existing agent
     */
    update(id: string, update: AgentUpdateRequest): Promise<AgentDefinition>;
    /**
     * Delete an agent by id
     */
    delete(id: string): Promise<DeleteAgentResponse>;
}
