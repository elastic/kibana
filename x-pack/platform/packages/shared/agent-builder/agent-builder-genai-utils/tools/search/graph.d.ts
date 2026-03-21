import type { TimeRange } from '@kbn/agent-builder-common';
import type { BaseMessage } from '@langchain/core/messages';
import type { ScopedModel, ToolEventEmitter, ToolHandlerResult } from '@kbn/agent-builder-server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { SearchTarget } from './types';
declare const StateAnnotation: import("@langchain/langgraph").AnnotationRoot<{
    nlQuery: import("@langchain/langgraph").LastValue<string>;
    targetPattern: import("@langchain/langgraph").LastValue<string | undefined>;
    rowLimit: import("@langchain/langgraph").LastValue<number | undefined>;
    customInstructions: import("@langchain/langgraph").LastValue<string | undefined>;
    timeRange: import("@langchain/langgraph").LastValue<TimeRange>;
    indexIsValid: import("@langchain/langgraph").LastValue<boolean>;
    searchTarget: import("@langchain/langgraph").LastValue<SearchTarget>;
    messages: import("@langchain/langgraph").BinaryOperatorAggregate<BaseMessage[], BaseMessage[]>;
    error: import("@langchain/langgraph").LastValue<string>;
    results: import("@langchain/langgraph").BinaryOperatorAggregate<ToolHandlerResult[], ToolHandlerResult[]>;
}>;
export type StateType = typeof StateAnnotation.State;
export declare const createSearchToolGraph: ({ model, esClient, logger, events, }: {
    model: ScopedModel;
    esClient: ElasticsearchClient;
    logger: Logger;
    events: ToolEventEmitter;
}) => import("@langchain/langgraph").CompiledStateGraph<{
    nlQuery: string;
    targetPattern: string | undefined;
    rowLimit: number | undefined;
    customInstructions: string | undefined;
    timeRange: TimeRange;
    indexIsValid: boolean;
    searchTarget: SearchTarget;
    messages: BaseMessage[];
    error: string;
    results: ToolHandlerResult[];
}, {
    nlQuery?: string | undefined;
    targetPattern?: string | undefined;
    rowLimit?: number | undefined;
    customInstructions?: string | undefined;
    timeRange?: TimeRange | undefined;
    indexIsValid?: boolean | undefined;
    searchTarget?: SearchTarget | undefined;
    messages?: BaseMessage[] | undefined;
    error?: string | undefined;
    results?: ToolHandlerResult[] | undefined;
}, "agent" | "execute_tool" | "__start__" | "check_index", {
    nlQuery: import("@langchain/langgraph").LastValue<string>;
    targetPattern: import("@langchain/langgraph").LastValue<string | undefined>;
    rowLimit: import("@langchain/langgraph").LastValue<number | undefined>;
    customInstructions: import("@langchain/langgraph").LastValue<string | undefined>;
    timeRange: import("@langchain/langgraph").LastValue<TimeRange>;
    indexIsValid: import("@langchain/langgraph").LastValue<boolean>;
    searchTarget: import("@langchain/langgraph").LastValue<SearchTarget>;
    messages: import("@langchain/langgraph").BinaryOperatorAggregate<BaseMessage[], BaseMessage[]>;
    error: import("@langchain/langgraph").LastValue<string>;
    results: import("@langchain/langgraph").BinaryOperatorAggregate<ToolHandlerResult[], ToolHandlerResult[]>;
}, {
    nlQuery: import("@langchain/langgraph").LastValue<string>;
    targetPattern: import("@langchain/langgraph").LastValue<string | undefined>;
    rowLimit: import("@langchain/langgraph").LastValue<number | undefined>;
    customInstructions: import("@langchain/langgraph").LastValue<string | undefined>;
    timeRange: import("@langchain/langgraph").LastValue<TimeRange>;
    indexIsValid: import("@langchain/langgraph").LastValue<boolean>;
    searchTarget: import("@langchain/langgraph").LastValue<SearchTarget>;
    messages: import("@langchain/langgraph").BinaryOperatorAggregate<BaseMessage[], BaseMessage[]>;
    error: import("@langchain/langgraph").LastValue<string>;
    results: import("@langchain/langgraph").BinaryOperatorAggregate<ToolHandlerResult[], ToolHandlerResult[]>;
}, import("@langchain/langgraph").StateDefinition, {
    check_index: {
        indexIsValid: boolean;
        searchTarget: {
            type: import("@kbn/agent-builder-common").EsResourceType;
            name: string;
        };
        error?: undefined;
    } | {
        indexIsValid: boolean;
        error: string;
        searchTarget?: undefined;
    };
    agent: {
        messages: import("@langchain/core/messages").AIMessageChunk[];
    };
    execute_tool: {
        messages: BaseMessage[];
        results: ToolHandlerResult[];
    };
}>;
export {};
