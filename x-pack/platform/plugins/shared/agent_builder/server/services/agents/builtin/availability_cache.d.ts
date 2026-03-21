import type { AgentAvailabilityContext, AgentAvailabilityConfig, AgentAvailabilityResult } from '@kbn/agent-builder-server/agents/builtin_definition';
export declare class AgentAvailabilityCache {
    private cache;
    /**
     * Get from cache, or recompute and store, then return.
     */
    getOrCompute(agentId: string, config: AgentAvailabilityConfig, context: AgentAvailabilityContext): Promise<AgentAvailabilityResult>;
    clear(): void;
    /**
     * Check if a value is cached for the given tool and context.
     */
    has(agentId: string, config: AgentAvailabilityConfig, context: AgentAvailabilityContext): boolean;
}
