import type { ChatCompleteCompositeResponse, Message, Model, ToolCall, ToolChoice, ToolDefinition, UnvalidatedToolCall } from '@kbn/inference-common';
import type { Span } from '@opentelemetry/api';
export declare function setChoice(span: Span, { content, toolCalls, }: {
    content: string;
    toolCalls: Array<ToolCall> | Array<UnvalidatedToolCall>;
}): void;
interface InferenceGenerationOptions {
    model?: Model;
    system?: string;
    messages: Message[];
    tools?: Record<string, ToolDefinition>;
    toolChoice?: ToolChoice;
}
/**
 * Wrapper around {@link withActiveInferenceSpan} that sets the right attributes for a chat operation span.
 * @param options
 * @param cb
 */
export declare function withChatCompleteSpan<T extends ChatCompleteCompositeResponse>(options: InferenceGenerationOptions, cb: (span?: Span) => T): T;
export {};
