import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
export interface FleetServerUsage {
    total_enrolled: number;
    healthy: number;
    unhealthy: number;
    offline: number;
    updating: number;
    inactive: number;
    unenrolled: number;
    total_all_statuses: number;
    num_host_urls: number;
}
export declare const getFleetServerUsage: (soClient?: SavedObjectsClientContract, esClient?: ElasticsearchClient) => Promise<any>;
export declare const getFleetServerConfig: (soClient: SavedObjectsClientContract) => Promise<any>;
