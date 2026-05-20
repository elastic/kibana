import { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { ChatCompletionChunkEvent, ChatCompletionTokenCountEvent } from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
export declare function parseInlineFunctionCalls({ logger }: {
    logger: Logger;
}): (source: Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>) => Observable<({
    content: string;
    refusal?: string;
    tool_calls: import("@kbn/inference-common").ChatCompletionChunkToolCall[];
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
