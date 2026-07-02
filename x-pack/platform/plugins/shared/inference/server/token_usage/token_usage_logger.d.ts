import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { TokenUsageContext } from './types';
export declare class TokenUsageLogger {
    private esClient?;
    private logger;
    private dataStreamReady;
    constructor(logger: Logger);
    setEsClient(esClient: ElasticsearchClient): void;
    log({ tokens, model, context, }: {
        tokens: ChatCompletionTokenCount;
        model?: string;
        context: TokenUsageContext;
    }): Promise<void>;
    private ensureDataStream;
    private writeDocument;
}
