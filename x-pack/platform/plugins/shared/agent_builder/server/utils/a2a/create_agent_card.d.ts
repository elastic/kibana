import type { AgentCard } from '@a2a-js/sdk';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolsServiceStart } from '../../services/tools';
interface CreateAgentCardParams {
    agent: AgentDefinition;
    baseUrl: string;
    toolsService: ToolsServiceStart;
    request: KibanaRequest;
}
export declare function createAgentCard({ agent, baseUrl, toolsService, request, }: CreateAgentCardParams): Promise<AgentCard>;
export {};
