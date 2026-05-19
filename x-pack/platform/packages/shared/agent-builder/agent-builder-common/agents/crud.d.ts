import type { AgentDefinition, AgentConfiguration } from './definition';
import type { AgentVisibility } from './visibility';
export interface AgentListOptions {
}
export type AgentCreateRequest = Omit<AgentDefinition, 'type' | 'readonly' | 'created_by'>;
export type AgentUpdateRequest = Partial<Pick<AgentDefinition, 'name' | 'description' | 'labels' | 'avatar_color' | 'avatar_symbol'>> & {
    visibility?: AgentVisibility;
    configuration?: Partial<AgentConfiguration>;
};
export type AgentDeleteRequest = Pick<AgentDefinition, 'id'>;
