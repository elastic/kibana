import type { AgentDefinition } from '@kbn/agent-builder-common';
export type GetAgentResponse = AgentDefinition;
export interface ListAgentResponse {
    results: AgentDefinition[];
}
export type UpdateAgentResponse = AgentDefinition;
export type CreateAgentResponse = AgentDefinition;
export interface DeleteAgentResponse {
    success: boolean;
}
