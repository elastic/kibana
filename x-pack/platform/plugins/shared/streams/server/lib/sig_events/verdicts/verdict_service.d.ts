import type { ElasticsearchClient } from '@kbn/core/server';
import { VerdictClient } from './verdict_client';
export declare class VerdictService {
    getClient({ esClient, space }: {
        esClient: ElasticsearchClient;
        space: string;
    }): VerdictClient;
}
