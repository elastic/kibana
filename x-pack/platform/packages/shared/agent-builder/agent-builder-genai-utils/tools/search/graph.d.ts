import type { TimeRange } from '@kbn/agent-builder-common';
import type { BaseMessage } from '@langchain/core/messages';
import type { ScopedModel, ToolEventEmitter, ToolHandlerResult } from '@kbn/agent-builder-server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TopSnippetsConfig } from '../steps/extract_snippets';
declare const StateAnnotation: import("@langchain/langgraph").AnnotationRoot<{
    nlQuery: import("@langchain/langgraph").LastValue<string>;
    targetPattern: import("@langchain/langgraph").LastValue<string | undefined>;
    rowLimit: import("@langchain/langgraph").LastValue<number | undefined>;
    customInstructions: import("@langchain/langgraph").LastValue<string | undefined>;
    /** When true, pattern targets (e.g. logs-*) search all matching indices. When false, a single index is chosen via index explorer. */
    allowPatternTarget: import("@langchain/langgraph").LastValue<boolean>;
    timeRange: import("@langchain/langgraph").LastValue<TimeRange>;
    messages: import("@langchain/langgraph").BaseChannel<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[], BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[]>, unknown>;
    error: import("@langchain/langgraph").LastValue<string>;
    results: import("@langchain/langgraph").BaseChannel<ToolHandlerResult[], ToolHandlerResult[] | import("@langchain/langgraph").OverwriteValue<ToolHandlerResult[]>, unknown>;
}>;
export type StateType = typeof StateAnnotation.State;
export declare const createSearchToolGraph: ({ model, esClient, logger, events, topSnippetsConfig, }: {
    model: ScopedModel;
    esClient: ElasticsearchClient;
    logger: Logger;
    events: ToolEventEmitter;
    topSnippetsConfig?: TopSnippetsConfig;
}) => import("@langchain/langgraph").CompiledStateGraph<{
    nlQuery: string;
    targetPattern: string | undefined;
    rowLimit: number | undefined;
    customInstructions: string | undefined;
    allowPatternTarget: boolean;
    timeRange: TimeRange;
    messages: BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[];
    error: string;
    results: ToolHandlerResult[];
}, {
    nlQuery?: string | undefined;
    targetPattern?: string | undefined;
    rowLimit?: number | undefined;
    customInstructions?: string | undefined;
    allowPatternTarget?: boolean | undefined;
    timeRange?: TimeRange | undefined;
    messages?: BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[]> | undefined;
    error?: string | undefined;
    results?: ToolHandlerResult[] | import("@langchain/langgraph").OverwriteValue<ToolHandlerResult[]> | undefined;
}, "execute_tool" | "__start__" | "select_and_dispatch", {
    nlQuery: import("@langchain/langgraph").LastValue<string>;
    targetPattern: import("@langchain/langgraph").LastValue<string | undefined>;
    rowLimit: import("@langchain/langgraph").LastValue<number | undefined>;
    customInstructions: import("@langchain/langgraph").LastValue<string | undefined>;
    /** When true, pattern targets (e.g. logs-*) search all matching indices. When false, a single index is chosen via index explorer. */
    allowPatternTarget: import("@langchain/langgraph").LastValue<boolean>;
    timeRange: import("@langchain/langgraph").LastValue<TimeRange>;
    messages: import("@langchain/langgraph").BaseChannel<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[], BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[]>, unknown>;
    error: import("@langchain/langgraph").LastValue<string>;
    results: import("@langchain/langgraph").BaseChannel<ToolHandlerResult[], ToolHandlerResult[] | import("@langchain/langgraph").OverwriteValue<ToolHandlerResult[]>, unknown>;
}, {
    nlQuery: import("@langchain/langgraph").LastValue<string>;
    targetPattern: import("@langchain/langgraph").LastValue<string | undefined>;
    rowLimit: import("@langchain/langgraph").LastValue<number | undefined>;
    customInstructions: import("@langchain/langgraph").LastValue<string | undefined>;
    /** When true, pattern targets (e.g. logs-*) search all matching indices. When false, a single index is chosen via index explorer. */
    allowPatternTarget: import("@langchain/langgraph").LastValue<boolean>;
    timeRange: import("@langchain/langgraph").LastValue<TimeRange>;
    messages: import("@langchain/langgraph").BaseChannel<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[], BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[] | import("@langchain/langgraph").OverwriteValue<BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[]>, unknown>;
    error: import("@langchain/langgraph").LastValue<string>;
    results: import("@langchain/langgraph").BaseChannel<ToolHandlerResult[], ToolHandlerResult[] | import("@langchain/langgraph").OverwriteValue<ToolHandlerResult[]>, unknown>;
}, import("@langchain/langgraph").StateDefinition, {
    select_and_dispatch: {
        error: string;
        messages?: undefined;
    } | {
        messages: import("@langchain/core/messages").AIMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>>[];
        error?: undefined;
    };
    execute_tool: {
        messages: BaseMessage<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>, import("@langchain/core/messages").MessageType>[];
        results: ToolHandlerResult[];
    };
}, unknown, unknown>;
export {};
