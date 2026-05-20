import type { Feature, QueryFeature, QueryType, Streams } from '@kbn/streams-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ChatCompletionTokenCount, BoundInferenceClient, ToolCallback, ToolDefinition } from '@kbn/inference-common';
import type { SignificantEventType } from './types';
import { type SignificantEventsToolUsage } from './tools/tool_usage';
export declare const DEFAULT_MAX_EXISTING_QUERIES_FOR_CONTEXT = 50;
export interface ExistingQuerySummary {
    id: string;
    title: string;
    type: string;
    severity_score?: number;
    description: string;
    esql: string;
}
/**
 * Intermediate representation of a query as produced by the LLM tool output.
 * Uses a flat `esql` string (vs the wrapped `EsqlQuery` in the wire type)
 * and carries the `category` from the tool schema.
 */
interface ParsedToolQuery {
    type: QueryType;
    esql: string;
    title: string;
    description: string;
    category: SignificantEventType;
    severity_score: number;
    evidence?: string[];
    replaces?: string;
    features: QueryFeature[];
}
/**
 * Generate significant event definitions using a reasoning agent that fetches
 * stream features (including computed dataset analysis) via tool calls.
 */
export declare function generateSignificantEvents({ stream, esClient, getFeatures, inferenceClient, signal, systemPrompt, logger, additionalTools, additionalToolCallbacks, existingQueries, maxExistingQueriesForContext, }: {
    stream: Streams.all.Definition;
    esClient: ElasticsearchClient;
    getFeatures(params?: {
        type?: string[];
        minConfidence?: number;
        limit?: number;
    }): Promise<Feature[]>;
    inferenceClient: BoundInferenceClient;
    signal: AbortSignal;
    logger: Logger;
    systemPrompt: string;
    additionalTools?: Record<string, ToolDefinition>;
    additionalToolCallbacks?: Record<string, ToolCallback>;
    existingQueries?: ExistingQuerySummary[];
    maxExistingQueriesForContext?: number;
}): Promise<{
    queries: ParsedToolQuery[];
    tokensUsed: ChatCompletionTokenCount;
    toolUsage: SignificantEventsToolUsage;
}>;
export {};
