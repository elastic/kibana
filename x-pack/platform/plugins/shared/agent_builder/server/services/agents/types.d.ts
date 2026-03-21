import type { KibanaRequest } from '@kbn/core/server';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import type { AgentRegistry } from './agent_registry';
import type { AgentsUsingToolsResult } from './persisted/types';
export interface AgentsServiceSetup {
    register(agent: BuiltInAgentDefinition): void;
}
export interface ToolRefsParams {
    request: KibanaRequest;
    toolIds: string[];
}
export interface AgentsServiceStart {
    getRegistry: (opts: {
        request: KibanaRequest;
    }) => Promise<AgentRegistry>;
    removeToolRefsFromAgents: (params: ToolRefsParams) => Promise<AgentsUsingToolsResult>;
    getAgentsUsingTools: (params: ToolRefsParams) => Promise<AgentsUsingToolsResult>;
}
