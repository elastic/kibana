import type { ToolAvailabilityContext, ToolAvailabilityConfig, ToolAvailabilityResult } from '@kbn/agent-builder-server';
export declare class ToolAvailabilityCache {
    private cache;
    /**
     * Get from cache, or recompute and store, then return.
     */
    getOrCompute(toolId: string, config: ToolAvailabilityConfig, context: ToolAvailabilityContext): Promise<ToolAvailabilityResult>;
    clear(): void;
    /**
     * Check if a value is cached for the given tool and context.
     */
    has(toolId: string, config: ToolAvailabilityConfig, context: ToolAvailabilityContext): boolean;
}
