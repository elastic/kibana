import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { RequestDiagnosticsAdditionalMetrics } from '../../../common/types';
import type { GetAgentsOptions } from '.';
export declare function requestDiagnostics(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, agentId: string, additionalMetrics?: RequestDiagnosticsAdditionalMetrics[]): Promise<{
    actionId: string;
}>;
export declare function bulkRequestDiagnostics(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, options: GetAgentsOptions & {
    batchSize?: number;
    additionalMetrics?: RequestDiagnosticsAdditionalMetrics[];
}): Promise<{
    actionId: string;
}>;
