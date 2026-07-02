import type { ContentBlockDeltaEvent, ContentBlockStartEvent, ContentBlockStopEvent, ConverseStreamMetadataEvent, MessageStartEvent, MessageStopEvent } from '@aws-sdk/client-bedrock-runtime';
import type { MessageHeaders } from '@smithy/types';
export interface ConverseCompletionChunk {
    type: 'contentBlockStart' | 'contentBlockDelta' | 'messageDelta' | 'metadata' | 'messageStart' | 'messageStop';
    body: ConverseResponse;
}
export type ConverseResponse = ContentBlockStartEvent | ContentBlockDeltaEvent | ContentBlockStopEvent | MessageStartEvent | MessageStopEvent | ConverseStreamMetadataEvent;
export interface ConverseBedrockChunkMember {
    headers: MessageHeaders;
    body: ConverseResponse;
}
