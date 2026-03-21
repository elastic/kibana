import { Observable } from 'rxjs';
import type { ChatCompletionChunkToolCall } from '@kbn/inference-common';
import { ChatCompletionEventType } from '@kbn/inference-common';
import type { ContentBlockDeltaEvent, ContentBlockStartEvent, ContentBlockStopEvent, ConverseStreamMetadataEvent, MessageStartEvent, MessageStopEvent } from '@aws-sdk/client-bedrock-runtime';
import { type CompletionChunk } from './types';
export declare function processCompletionChunks(model?: string): (source: Observable<CompletionChunk>) => Observable<({
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
type ConverseResponse = ContentBlockDeltaEvent | ContentBlockStartEvent | ContentBlockStopEvent | MessageStartEvent | MessageStopEvent | ConverseStreamMetadataEvent;
export interface ConverseCompletionChunk {
    type: 'contentBlockStart' | 'contentBlockDelta' | 'messageDelta' | 'metadata' | 'messageStart' | 'messageStop';
    body: ConverseResponse;
}
export declare function processConverseCompletionChunks(model?: string): (source: Observable<ConverseCompletionChunk>) => Observable<({
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
export {};
