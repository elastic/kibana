import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
export interface AgentsPerOutputType {
    output_type: string;
    count_as_data: number;
    count_as_monitoring: number;
    preset_counts?: {
        balanced: number;
        custom: number;
        latency: number;
        scale: number;
        throughput: number;
    };
    sync_integrations?: boolean;
}
export declare function getAgentsPerOutput(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient): Promise<AgentsPerOutputType[]>;
