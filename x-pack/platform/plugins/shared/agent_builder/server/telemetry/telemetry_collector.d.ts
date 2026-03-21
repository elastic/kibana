import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { Logger } from '@kbn/logging';
/**
 * Timing percentile metrics structure
 */
interface TimingPercentiles {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    mean: number;
    total_samples: number;
}
interface ConversationMetrics {
    total: number;
    total_rounds: number;
    avg_rounds_per_conversation: number;
    rounds_distribution: Array<{
        bucket: string;
        count: number;
    }>;
    tokens_used: number;
    tokens_input: number;
    tokens_output: number;
    average_tokens_per_conversation: number;
}
/**
 * Telemetry payload schema for Agent Builder
 */
export interface AgentBuilderTelemetry {
    custom_tools: {
        total: number;
        by_type: Array<{
            type: string;
            count: number;
        }>;
    };
    custom_agents: {
        total: number;
    };
    conversations: ConversationMetrics;
    daily: ConversationMetrics;
    query_to_result_time: {
        p50: number;
        p75: number;
        p90: number;
        p95: number;
        p99: number;
        mean: number;
    };
    time_to_first_token: TimingPercentiles;
    /**
     * Token consumption grouped by model
     */
    tokens_by_model: Array<{
        model: string;
        total_tokens: number;
        avg_tokens_per_round: number;
        sample_count: number;
    }>;
    /**
     * Query-to-result timing (proxied by TTLT) grouped by model
     */
    query_to_result_time_by_model: Array<{
        model: string;
        sample_count: number;
    } & TimingPercentiles>;
    /**
     * Query-to-result timing (proxied by TTLT) grouped by agent
     */
    query_to_result_time_by_agent_type: Array<{
        agent_id: string;
        sample_count: number;
    } & TimingPercentiles>;
    /**
     * Tool calls grouped by model (derived from conversation round steps)
     */
    tool_calls_by_model: Array<{
        model: string;
        count: number;
    }>;
    tool_calls: {
        total: number;
        by_source: {
            default_agent: number;
            custom_agent: number;
            mcp: number;
            api: number;
            a2a: number;
        };
    };
    llm_usage: {
        by_provider: Array<{
            provider: string;
            count: number;
        }>;
        by_model: Array<{
            model: string;
            count: number;
        }>;
    };
    errors: {
        total: number;
        avg_errors_per_conversation: number;
        total_conversations_with_errors: number;
        by_type: Array<{
            type: string;
            count: number;
        }>;
    };
}
/**
 * Register telemetry collector for Agent Builder
 * @param usageCollection - Usage collection setup contract
 * @param logger - Logger instance
 */
export declare function registerTelemetryCollector(usageCollection: UsageCollectionSetup | undefined, logger: Logger): void;
export {};
