import { Observable, type Subscriber } from 'rxjs';
import type { ChatCompletionChunkEvent, ChatCompletionTokenCountEvent } from '@kbn/inference-common';
import type { GenerateContentResponseChunk, GenerateContentResponse } from './types';
type ChunkEvent = ChatCompletionChunkEvent | ChatCompletionTokenCountEvent;
export declare function processVertexStream(model?: string): (source: Observable<GenerateContentResponseChunk>) => Observable<ChunkEvent>;
export declare function processVertexResponse(model?: string): (source: Observable<GenerateContentResponse>) => Observable<ChunkEvent>;
export declare function processChunk({ chunk, subscriber, model, }: {
    chunk: GenerateContentResponseChunk | GenerateContentResponse;
    subscriber: Subscriber<ChunkEvent>;
    model?: string;
}): void;
export {};
