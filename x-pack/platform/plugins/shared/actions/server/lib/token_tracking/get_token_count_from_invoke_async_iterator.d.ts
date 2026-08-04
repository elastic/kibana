import type { Logger } from '@kbn/logging';
import type { Stream } from 'openai/streaming';
import type { ChatCompletionMessageParam, ChatCompletionChunk } from 'openai/resources/chat/completions';
export interface InvokeAsyncIteratorBody {
    messages: ChatCompletionMessageParam[];
}
/**
 * Takes the OpenAI and Bedrock `invokeStream` sub action response stream and the request messages array as inputs.
 * Uses gpt-tokenizer encoding to calculate the number of tokens in the prompt and completion parts of the response stream
 * Returns an object containing the total, prompt, and completion token counts.
 * @param streamIterable the response iterator from the `invokeAsyncIterator` sub action
 * @param body the request messages array
 * @param logger the logger
 */
export declare function getTokenCountFromInvokeAsyncIterator({ streamIterable, body, logger, }: {
    streamIterable: Stream<ChatCompletionChunk>;
    body: InvokeAsyncIteratorBody;
    logger: Logger;
}): Promise<{
    total: number;
    prompt: number;
    completion: number;
}>;
