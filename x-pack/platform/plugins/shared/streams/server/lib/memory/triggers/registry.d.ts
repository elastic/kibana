import type { Logger } from '@kbn/logging';
import type { MemoryUpdateTrigger, MemoryUpdateContext } from './types';
/**
 * Registry for memory update triggers. Triggers are invoked when specific events
 * occur (e.g. KI deletion, discovery completion) to update the memory knowledge base.
 */
export declare class MemoryTriggerRegistry {
    private readonly triggers;
    private readonly logger;
    constructor({ logger }: {
        logger: Logger;
    });
    /**
     * Register a new trigger. Throws if a trigger with the same ID is already registered.
     */
    register(trigger: MemoryUpdateTrigger): void;
    /**
     * Execute a trigger by ID with the given context.
     * Errors are caught and logged — trigger failures should not break calling code.
     */
    execute(triggerId: string, context: Omit<MemoryUpdateContext, 'trigger'> & {
        payload?: Record<string, unknown>;
    }): Promise<void>;
    /**
     * Get all registered trigger IDs.
     */
    getRegisteredTriggers(): string[];
}
