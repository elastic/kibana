import type { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type { MessageChunkEvent, MessageCompleteEvent, ReasoningEvent, ThinkingCompleteEvent, ToolCallEvent, PromptRequestEvent, BrowserToolCallEvent, ToolResultEvent, BackgroundAgentCompleteEvent } from '@kbn/agent-builder-common/chat/events';
import { type ToolOrigin } from '@kbn/agent-builder-common';
import type { BackgroundExecutionState } from '@kbn/agent-builder-common/chat';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { PromptRequestSource, PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
export declare const isStreamEvent: (input: any) => input is LangchainStreamEvent;
export declare const matchGraphName: (event: LangchainStreamEvent, graphName: string) => boolean;
export declare const matchGraphNode: (event: LangchainStreamEvent, nodeName: string) => boolean;
export declare const matchEvent: (event: LangchainStreamEvent, eventName: string) => boolean;
export declare const matchName: (event: LangchainStreamEvent, name: string) => boolean;
export declare const hasTag: (event: LangchainStreamEvent, tag: string) => boolean;
export declare const createToolCallEvent: (data: {
    toolCallId: string;
    toolId: string;
    params: Record<string, unknown>;
    toolCallGroupId?: string;
    toolOrigin?: ToolOrigin;
}) => ToolCallEvent;
export declare const createPromptRequestEvent: ({ prompt, source, }: {
    prompt: PromptRequest;
    source: PromptRequestSource;
}) => PromptRequestEvent;
export declare const createBrowserToolCallEvent: (data: {
    toolCallId: string;
    toolId: string;
    params: Record<string, unknown>;
}) => BrowserToolCallEvent;
export declare const createToolResultEvent: (data: {
    toolCallId: string;
    toolId: string;
    results: ToolResult[];
}) => ToolResultEvent;
export declare const createTextChunkEvent: (chunk: string, { messageId }?: {
    messageId?: string;
}) => MessageChunkEvent;
export declare const createMessageEvent: (content: string | object, { messageId }?: {
    messageId?: string;
}) => MessageCompleteEvent;
export declare const createReasoningEvent: (reasoning: string, { transient, toolCallId, toolCallGroupId, }?: {
    transient?: boolean;
    toolCallId?: string;
    toolCallGroupId?: string;
}) => ReasoningEvent;
export declare const createThinkingCompleteEvent: (timeToFirstToken: number) => ThinkingCompleteEvent;
export declare const createBackgroundAgentCompleteEvent: (execution: BackgroundExecutionState) => BackgroundAgentCompleteEvent;
