import type { Logger } from '@kbn/logging';
import type { Readable } from 'stream';
export interface InvokeBody {
    messages: Array<{
        role: string;
        content: string;
    }>;
    signal?: AbortSignal;
}
interface UsageMetadata {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
}
/**
 * Takes the OpenAI and Bedrock `invokeStream` sub action response stream and the request messages array as inputs.
 * Uses gpt-tokenizer encoding to calculate the number of tokens in the prompt and completion parts of the response stream
 * Returns an object containing the total, prompt, and completion token counts.
 * @param responseStream the response stream from the `invokeStream` sub action
 * @param body the request messages array
 * @param logger the logger
 */
export declare function getTokenCountFromInvokeStream({ actionTypeId, responseStream, body, logger, }: {
    actionTypeId: string;
    responseStream: Readable;
    body: InvokeBody;
    logger: Logger;
}): Promise<{
    total: number;
    prompt: number;
    completion: number;
}>;
export declare const parseGeminiStreamForUsageMetadata: ({ responseStream, logger, }: {
    responseStream: Readable;
    logger: Logger;
}) => Promise<UsageMetadata | null>;
export {};
