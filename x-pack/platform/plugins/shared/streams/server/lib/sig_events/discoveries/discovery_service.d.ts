import type { ElasticsearchClient } from '@kbn/core/server';
import { DiscoveryClient } from './discovery_client';
export declare class DiscoveryService {
    getClient({ esClient, space, }: {
        esClient: ElasticsearchClient;
        space: string;
    }): DiscoveryClient;
}
