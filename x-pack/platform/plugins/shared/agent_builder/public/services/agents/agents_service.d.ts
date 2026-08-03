import type { HttpSetup } from '@kbn/core-http-browser';
import type { AgentAccessControl } from '@kbn/agent-builder-common';
import type { AgentAccessControlUpdateRequest, AgentCreateRequest, AgentListOptions, AgentUpdateRequest } from '../../../common/agents';
import type { DeleteAgentResponse, AgentDefinitionWithPermissions, GetAgentAccessControlResponse } from '../../../common/http_api/agents';
export declare class AgentService {
    private readonly http;
    constructor({ http }: {
        http: HttpSetup;
    });
    /**
     * List all agents
     */
    list(options?: AgentListOptions): Promise<AgentDefinitionWithPermissions[]>;
    /**
     * Get a single agent by id
     */
    get(id: string): Promise<AgentDefinitionWithPermissions>;
    /**
     * Create a new agent
     */
    create(profile: AgentCreateRequest): Promise<AgentDefinitionWithPermissions>;
    /**
     * Update an existing agent
     */
    update(id: string, update: AgentUpdateRequest): Promise<AgentDefinitionWithPermissions>;
    /**
     * Delete an agent by id
     */
    delete(id: string): Promise<DeleteAgentResponse>;
    /**
     * Get access control for an agent. Callers without manage rights receive redacted entries.
     */
    getAccessControl(id: string): Promise<GetAgentAccessControlResponse>;
    /**
     * Replace access-control entries for an agent.
     */
    updateAccessControl(id: string, update: AgentAccessControlUpdateRequest): Promise<AgentAccessControl>;
}
