import type { Logger } from '@kbn/logging';
import type { AgentExecutionClient } from '../persistence';
/**
 * Monitors an agent execution for abort requests by polling the execution status.
 * When the status becomes 'aborted', triggers the abort controller.
 */
export declare class AbortMonitor {
    private readonly executionId;
    private readonly executionClient;
    private readonly abortController;
    private readonly logger;
    private intervalId;
    private stopped;
    constructor({ executionId, executionClient, logger, }: {
        executionId: string;
        executionClient: AgentExecutionClient;
        logger: Logger;
    });
    /**
     * Get the abort signal to pass to the agent execution code.
     */
    getSignal(): AbortSignal;
    /**
     * Start polling for abort status.
     */
    start(): void;
    /**
     * Stop polling and clean up.
     */
    stop(): void;
    private checkAbortStatus;
}
