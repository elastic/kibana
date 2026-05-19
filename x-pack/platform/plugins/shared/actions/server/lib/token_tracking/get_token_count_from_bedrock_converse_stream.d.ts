import type { Logger } from '@kbn/logging';
import type { Readable } from 'stream';
export declare const getTokensFromBedrockConverseStream: (responseStream: Readable, logger: Logger) => Promise<{
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
} | null>;
