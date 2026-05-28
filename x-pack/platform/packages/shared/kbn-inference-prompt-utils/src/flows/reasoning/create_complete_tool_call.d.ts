import type { AssistantMessage, ToolMessage } from '@kbn/inference-common';
export declare function createCompleteToolCallResponse(toolCallId: string): ToolMessage;
export declare function createCompleteToolCall(): [AssistantMessage, ToolMessage];
