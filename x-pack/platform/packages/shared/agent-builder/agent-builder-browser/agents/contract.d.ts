import type { AgentDefinition } from '@kbn/agent-builder-common';
/**
 * Public-faving contract for AgentBuilder's agents service.
 */
export interface AgentsServiceStartContract {
    /**
     * List all agents available.
     */
    list(): Promise<AgentDefinition[]>;
}
