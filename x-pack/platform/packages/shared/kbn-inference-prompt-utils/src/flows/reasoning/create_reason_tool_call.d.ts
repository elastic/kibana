import type { AssistantMessage, ToolMessage } from '@kbn/inference-common';
export declare function createReasonToolCall(): [AssistantMessage, ToolMessage];
export declare function createReasonToolCallResponse(toolCallId: string): ToolMessage;
