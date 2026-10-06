import type { ChatCompleteCacheControl, ChatCompleteCompositeResponse, ChatCompletionReasoning, Message, Model, ToolChoice, ToolDefinition } from '@kbn/inference-common';
import type { Span } from '@opentelemetry/api';
interface InferenceGenerationOptions {
    model?: Model;
    system?: string;
    messages: Message[];
    tools?: Record<string, ToolDefinition>;
    toolChoice?: ToolChoice;
    cacheControl?: ChatCompleteCacheControl;
    sessionId?: string;
    reasoning?: ChatCompletionReasoning;
}
/**
 * Wrapper around {@link withActiveInferenceSpan} that sets the right attributes for a chat operation span.
 * @param options
 * @param cb
 */
export declare function withChatCompleteSpan<T extends ChatCompleteCompositeResponse>(options: InferenceGenerationOptions, cb: (span?: Span) => T): T;
export {};
