import type { ChatCompletionChunkEvent, UnvalidatedToolCall } from '@kbn/inference-common';
interface UnvalidatedMessage {
    content: string;
    refusal?: string;
    tool_calls: UnvalidatedToolCall[];
}
/**
 * Merges chunks into a message, concatenating the content and tool calls.
 */
export declare const mergeChunks: (chunks: ChatCompletionChunkEvent[]) => UnvalidatedMessage;
export {};
