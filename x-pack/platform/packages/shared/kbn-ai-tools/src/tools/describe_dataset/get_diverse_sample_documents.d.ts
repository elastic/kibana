import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
interface GetDiverseSampleDocumentsOptions {
    esClient: ElasticsearchClient;
    index: string | string[];
    start: number;
    end: number;
    offset: number;
    size?: number;
    logger: Logger;
}
export declare function getDiverseSampleDocuments({ esClient, index, start, end, size, offset, logger, }: GetDiverseSampleDocumentsOptions): Promise<{
    hits: Array<SearchHit<Record<string, unknown>>>;
}>;
export {};
