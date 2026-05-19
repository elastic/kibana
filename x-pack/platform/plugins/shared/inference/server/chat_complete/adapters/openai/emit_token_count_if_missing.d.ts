import type { OperatorFunction } from 'rxjs';
import type { ChatCompletionChunkEvent, ChatCompletionTokenCountEvent } from '@kbn/inference-common';
import type { OpenAIRequest } from './types';
/**
 * Operator mirroring the source and then emitting a tokenCount event when the source completes,
 * if and only if the source did not emit a tokenCount event itself.
 *
 * This is used to manually count tokens and emit the associated event for
 * providers that don't support sending token counts for the stream API.
 *
 * @param request the OpenAI request that was sent to the connector.
 */
export declare function emitTokenCountEstimateIfMissing<T extends ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>({ request }: {
    request: OpenAIRequest;
}): OperatorFunction<T, T | ChatCompletionTokenCountEvent>;
export declare function manuallyCountTokens(request: OpenAIRequest, chunks: ChatCompletionChunkEvent[]): ChatCompletionTokenCountEvent;
