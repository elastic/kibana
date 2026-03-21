import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
export declare const isIndexNotFoundError: (error: unknown) => boolean;
/**
 * Usage counter data from saved objects
 */
export interface UsageCounterData {
    counterName: string;
    counterType: string;
    count: number;
    domainId: string;
}
/**
 * Query utilities for telemetry data collection
 *
 * Provides helpers for querying:
 * - Usage counters from saved objects
 * - Conversation data from Elasticsearch
 * - Custom tools and agents from Elasticsearch
 */
export declare class QueryUtils {
    private readonly esClient;
    private readonly soClient;
    private readonly logger;
    constructor(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, logger: Logger);
    /**
     * Get all usage counters for a specific domain
     * @param domainId - Domain identifier (e.g., 'agent_builder')
     * @param lookbackMs - Optional lookback window in milliseconds (defaults to last 24h)
     * @returns Array of usage counter data
     */
    getCountersByDomain(domainId: string, lookbackMs?: number): Promise<UsageCounterData[]>;
    /**
     * Get usage counters filtered by name prefix
     * @param domainId - Domain identifier
     * @param prefix - Counter name prefix (e.g., 'tool_call_')
     * @param lookbackMs
     * @returns Map of counter name → count
     */
    getCountersByPrefix(domainId: string, prefix: string, lookbackMs?: number): Promise<Map<string, number>>;
    getCustomToolsMetrics(): Promise<{
        total: any;
        by_type: any;
    }>;
    /**
     * Get counts of custom agents from Elasticsearch
     */
    getCustomAgentsMetrics(): Promise<number>;
    /**
     * Get conversation metrics from Elasticsearch
     */
    getConversationMetrics(dateFilter?: {
        gte: string;
    }): Promise<{
        total: any;
        total_rounds: number;
        avg_rounds_per_conversation: number;
        rounds_distribution: any;
        tokens_used: number;
        tokens_input: number;
        tokens_output: number;
        average_tokens_per_conversation: number;
    }>;
    /**
     * TTFT/TTLT percentile metrics structure
     */
    private readonly defaultTimingMetrics;
    /**
     * Get Time-to-First-Token (TTFT) metrics from conversation rounds
     * Queries the conversations index and aggregates TTFT data
     */
    getTTFTMetrics(): Promise<{
        p50: number;
        p75: number;
        p90: number;
        p95: number;
        p99: number;
        mean: number;
        total_samples: number;
    }>;
    /**
     * Get Time-to-Last-Token (TTLT) metrics from conversation rounds
     * Queries the conversations index and aggregates TTLT data
     */
    getTTLTMetrics(): Promise<{
        p50: number;
        p75: number;
        p90: number;
        p95: number;
        p99: number;
        mean: number;
        total_samples: number;
    }>;
    /**
     * Get latency breakdown by model
     * Returns TTFT and TTLT p50/p95 for each model
     * Uses stored model info from conversation rounds
     */
    getLatencyByModel(): Promise<Array<{
        model: string;
        ttft_p50: number;
        ttft_p95: number;
        ttlt_p50: number;
        ttlt_p95: number;
        sample_count: number;
    }>>;
    /**
     * Get query-to-result time (TTLT) grouped by agent
     * Returns TTLT percentiles/mean for each agent_id
     */
    getQueryToResultTimeByAgentType(): Promise<Array<{
        agent_id: string;
        p50: number;
        p75: number;
        p90: number;
        p95: number;
        p99: number;
        mean: number;
        total_samples: number;
        sample_count: number;
    }>>;
    /**
     * Get token consumption grouped by model
     */
    getTokensByModel(): Promise<Array<{
        model: string;
        total_tokens: number;
        avg_tokens_per_round: number;
        sample_count: number;
    }>>;
    /**
     * Get query-to-result time (TTLT) grouped by model
     */
    getQueryToResultTimeByModel(): Promise<Array<{
        model: string;
        p50: number;
        p75: number;
        p90: number;
        p95: number;
        p99: number;
        mean: number;
        total_samples: number;
        sample_count: number;
    }>>;
    /**
     * Get tool call counts grouped by model based on round steps
     */
    getToolCallsByModel(): Promise<Array<{
        model: string;
        count: number;
    }>>;
    /**
     * Calculate percentiles from bucketed time data
     * @param buckets - Map of bucket name → count
     * @returns Calculated percentiles (p50, p75, p90, p95, p99, mean)
     */
    calculatePercentilesFromBuckets(buckets: Map<string, number>, domainPrefix?: string): {
        p50: number;
        p75: number;
        p90: number;
        p95: number;
        p99: number;
        mean: number;
    };
}
