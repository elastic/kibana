import type { ElasticsearchClient } from '@kbn/core/server';
import type { VerdictClient } from './verdict_client';
export declare class VerdictService {
    getClient({ esClient, space }: {
        esClient: ElasticsearchClient;
        space: string;
    }): VerdictClient;
}
