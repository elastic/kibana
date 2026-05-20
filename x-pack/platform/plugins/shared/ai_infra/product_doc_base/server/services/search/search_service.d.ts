import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DocSearchOptions, DocSearchResponse } from './types';
export declare class SearchService {
    private readonly log;
    private readonly esClient;
    constructor({ logger, esClient }: {
        logger: Logger;
        esClient: ElasticsearchClient;
    });
    search(options: DocSearchOptions): Promise<DocSearchResponse>;
}
