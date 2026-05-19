import { Observable } from 'rxjs';
import type { ChatCompletionChunkToolCall } from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
import type { ConverseResponse } from '@aws-sdk/client-bedrock-runtime';
export declare function processConverseResponse(model?: string): (source: Observable<ConverseResponse>) => Observable<({
    content: string;
    refusal?: string;
    tool_calls: ChatCompletionChunkToolCall[];
    deanonymized_input?: import("@kbn/inference-common").DeanonymizedMessageData[];
    deanonymized_output?: import("@kbn/inference-common").DeanonymizedMessageData;
    metadata?: import("@kbn/inference-common").AnonymizationResponseMetadata;
} & {
    type: ChatCompletionEventType.ChatCompletionChunk;
}) | ({
    tokens: import("@kbn/inference-common").ChatCompletionTokenCount;
    model?: string;
} & {
    type: ChatCompletionEventType.ChatCompletionTokenCount;
})>;
