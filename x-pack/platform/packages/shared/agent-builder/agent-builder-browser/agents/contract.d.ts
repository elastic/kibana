import type { AgentDefinition } from '@kbn/agent-builder-common';
/**
 * Public-faving contract for AgentBuilder's agents service.
 */
export interface AgentsServiceStartContract {
    /**
     * List all agents available.
     */
    list(): Promise<AgentDefinition[]>;
    /**
     * Add a skill to an agent's configuration, returning the updated agent.
     * Idempotent: a skill already present on the agent leaves it unchanged.
     */
    addSkillToAgent(params: {
        agentId: string;
        skillId: string;
    }): Promise<AgentDefinition>;
}
