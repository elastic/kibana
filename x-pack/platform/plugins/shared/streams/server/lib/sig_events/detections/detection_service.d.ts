import type { ElasticsearchClient } from '@kbn/core/server';
import type { DetectionClient } from './detection_client';
export declare class DetectionService {
    getClient({ esClient, space, }: {
        esClient: ElasticsearchClient;
        space: string;
    }): DetectionClient;
}
