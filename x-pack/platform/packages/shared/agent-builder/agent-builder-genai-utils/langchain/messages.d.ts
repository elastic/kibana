import type { BaseMessage } from '@langchain/core/messages';
import { ToolMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
import type { RunToolReturn } from '@kbn/agent-builder-server';
/**
 * Extract the text content from a langchain message or chunk.
 */
export declare const extractTextContent: (message: BaseMessage) => string;
export interface ToolCall {
    toolCallId: string;
    toolName: string;
    args: Record<string, any>;
}
export interface ToolCallWithReasoning extends ToolCall {
    reasoning?: string;
}
/**
 * Extracts the tool calls from a message.
 */
export declare const extractToolCalls: (message: BaseMessage) => ToolCall[];
export declare const extractToolCallsWithReasoning: (message: BaseMessage) => ToolCallWithReasoning[];
/**
 * Extract the structured tool return from a given tool message.
 * Note: this assumes the tool call was performed with the right configuration, so that
 * it was executed from a agentBuilder agent.
 */
export declare const extractToolReturn: (message: ToolMessage) => RunToolReturn;
export declare const generateFakeToolCallId: () => string;
export declare const createUserMessage: (content: string, { clean }?: {
    clean?: boolean;
}) => HumanMessage;
export declare const createAIMessage: (content: string, { clean }?: {
    clean?: boolean;
}) => AIMessage;
export declare const wrapToolResultContent: (content: string) => string;
export declare const createToolResultMessage: ({ content, toolCallId, wrapToolResult, }: {
    content: unknown;
    toolCallId: string;
    wrapToolResult?: boolean;
}) => ToolMessage;
export declare const createToolCallMessage: (toolCallOrCalls: ToolCallWithReasoning | ToolCallWithReasoning[], message?: string) => AIMessage;
