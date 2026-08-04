import type { Readable } from 'stream';
import type { Logger } from '@kbn/logging';
export declare function getTokenCountFromOpenAIStream({ responseStream, body, logger, }: {
    responseStream: Readable;
    body: string;
    logger: Logger;
}): Promise<{
    total: number;
    prompt: number;
    completion: number;
}>;
