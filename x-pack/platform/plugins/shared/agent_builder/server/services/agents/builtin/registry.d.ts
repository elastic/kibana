import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
export interface BuiltinAgentRegistry {
    register(agent: BuiltInAgentDefinition): void;
    has(agentId: string): boolean;
    get(agentId: string): BuiltInAgentDefinition | undefined;
    list(): BuiltInAgentDefinition[];
}
export declare const createBuiltinAgentRegistry: () => BuiltinAgentRegistry;
