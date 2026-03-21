import type { Logger } from '@kbn/logging';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
/**
 * Tool call source - identifies where the tool was called from
 */
export declare enum ToolCallSource {
    DEFAULT_AGENT = "default_agent",
    CUSTOM_AGENT = "custom_agent",
    MCP = "mcp",
    API = "api",
    A2A = "a2a"
}
/**
 * Tracking service for telemetry collection
 *
 * Centralized service for tracking all metrics related to Agent Builder usage:
 * - Tool calls by source
 * - Errors by type and context
 * - Conversation rounds
 * - Query-to-result times
 * - LLM provider and model usage
 * - Token consumption
 */
export declare class TrackingService {
    private readonly usageCounter;
    private readonly logger;
    private queryStartTimes;
    private conversationsWithErrors;
    constructor(usageCounter: UsageCounter, logger: Logger);
    /**
     * Track a tool call
     * @param toolId - Tool identifier
     * @param source - Where the tool was called from
     */
    trackToolCall(toolId: string, source: ToolCallSource): void;
    /**
     * Track conversation round count
     * @param conversationId - Conversation identifier
     * @param roundNumber - Current round number
     */
    trackConversationRound(conversationId: string, roundNumber: number): void;
    /**
     * Track query start time
     * @param requestId - Unique request identifier
     */
    trackQueryStart(requestId?: string): string | undefined;
    /**
     * Track query end time and calculate duration
     * @param requestId - Unique request identifier
     */
    trackQueryEnd(requestId: string): void;
    /**
     * Track LLM usage by provider and model
     * @param provider - LLM provider (e.g., 'openai', 'bedrock')
     * @param model - Model identifier
     */
    trackLLMUsage(provider: string | undefined, model: string | undefined): void;
    /**
     * Track an error surfaced to users
     * @param error - Error object
     * @param conversationId - Optional conversation ID (used only to track unique conversations with errors, not logged/stored)
     */
    trackError(error: unknown, conversationId?: string): void;
}
