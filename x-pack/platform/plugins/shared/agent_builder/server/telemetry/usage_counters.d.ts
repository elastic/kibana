import type { UsageCollectionSetup, UsageCounter } from '@kbn/usage-collection-plugin/server';
/**
 * Domain ID for all agentBuilder usage counters
 */
export declare const AGENTBUILDER_USAGE_DOMAIN = "agent_builder";
/**
 * Create usage counter for agentBuilder plugin
 * @param usageCollection - Usage collection setup contract
 * @returns Usage counter instance
 */
export declare function createAgentBuilderUsageCounter(usageCollection?: UsageCollectionSetup): UsageCounter | undefined;
/**
 * Helper to track tool calls with source
 * @param usageCounter - Usage counter instance
 * @param source - Tool call source
 */
export declare function trackToolCall(usageCounter: UsageCounter | undefined, source: 'default_agent' | 'custom_agent' | 'mcp' | 'api' | 'a2a'): void;
/**
 * Helper to track LLM usage
 * @param usageCounter - Usage counter instance
 * @param provider - LLM provider (e.g., 'openai', 'bedrock')
 * @param model - Model identifier
 */
export declare function trackLLMUsage(usageCounter: UsageCounter | undefined, provider: string, model: string): void;
/**
 * Helper to track conversation rounds
 * @param usageCounter - Usage counter instance
 * @param roundNumber - Current round number
 */
export declare function trackConversationRound(usageCounter: UsageCounter | undefined, roundNumber: number): void;
/**
 * Helper to track query-to-result time
 * @param usageCounter - Usage counter instance
 * @param durationMs - Duration in milliseconds
 */
export declare function trackQueryToResultTime(usageCounter: UsageCounter | undefined, durationMs: number): void;
