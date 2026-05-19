import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';
import type { ScopedModel, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { TimeRange } from '@kbn/agent-builder-common';
import type { ResourceListResult, ToolResult } from '@kbn/agent-builder-common/tools';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { TopSnippetsConfig } from '../steps/extract_snippets';
export declare const relevanceSearchToolName = "relevance_search";
export declare const createRelevanceSearchTool: ({ model, esClient, events, logger, topSnippetsConfig, }: {
    model: ScopedModel;
    esClient: ElasticsearchClient;
    events?: ToolEventEmitter;
    logger: Logger;
    topSnippetsConfig?: TopSnippetsConfig;
}) => import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    term: z.ZodString;
    index: z.ZodString;
    size: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>, {
    term: string;
    index: string;
    size: number;
}, {
    term: string;
    index: string;
    size?: number | undefined;
}, (string | {
    results: ResourceListResult[];
})[], "relevance_search">;
export declare const naturalLanguageSearchToolName = "natural_language_search";
export declare const createNaturalLanguageSearchTool: ({ model, esClient, events, logger, rowLimit, customInstructions, timeRange, }: {
    model: ScopedModel;
    esClient: ElasticsearchClient;
    events: ToolEventEmitter;
    logger: Logger;
    rowLimit?: number;
    customInstructions?: string;
    timeRange: TimeRange;
}) => import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    query: z.ZodString;
    index: z.ZodString;
}, z.core.$strip>, {
    query: string;
    index: string;
}, {
    query: string;
    index: string;
}, (string | {
    results: ToolResult[];
})[], "natural_language_search">;
export declare const noMatchingResourceToolName = "no_matching_resource";
export declare const NO_MATCHING_RESOURCE_ERROR = "Could not figure out which data source to use";
export declare const createNoMatchingResourceTool: () => import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{}, z.core.$strip>, Record<string, never>, Record<string, never>, (string | {
    results: import("@kbn/agent-builder-common").ErrorResult[];
})[], "no_matching_resource">;
