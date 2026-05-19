import type { Observable } from 'rxjs';
export declare function processOpenAIStream(): (source: Observable<string>) => Observable<({
    content: string;
    refusal?: string;
    tool_calls: import("@kbn/inference-common").ChatCompletionChunkToolCall[];
    deanonymized_input?: import("@kbn/inference-common").DeanonymizedMessageData[];
    deanonymized_output?: import("@kbn/inference-common").DeanonymizedMessageData;
    metadata?: import("@kbn/inference-common").AnonymizationResponseMetadata;
} & {
    type: import("@kbn/inference-common").ChatCompletionEventType.ChatCompletionChunk;
}) | ({
    tokens: import("@kbn/inference-common").ChatCompletionTokenCount;
    model?: string;
} & {
    type: import("@kbn/inference-common").ChatCompletionEventType.ChatCompletionTokenCount;
})>;
