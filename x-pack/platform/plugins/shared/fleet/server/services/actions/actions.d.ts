import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { FleetActionRequest, FleetActionResult, BulkCreateResponse } from './types';
export declare const createAction: (esClient: ElasticsearchClient, action: FleetActionRequest) => Promise<FleetActionRequest>;
export declare const bulkCreateActions: (esClient: ElasticsearchClient, _actions: FleetActionRequest[]) => Promise<BulkCreateResponse>;
export declare const getActionsByIds: (esClient: ElasticsearchClient, actionIds: string[]) => Promise<{
    items: FleetActionRequest[];
    total: number;
}>;
export declare const getActionsWithKuery: (esClient: ElasticsearchClient, kuery: string) => Promise<{
    items: FleetActionRequest[];
    total: number;
}>;
export declare const getActionResultsByIds: (esClient: ElasticsearchClient, actionIds: string[]) => Promise<{
    items: FleetActionResult[];
    total: number;
}>;
export declare const getActionResultsWithKuery: (esClient: ElasticsearchClient, kuery: string) => Promise<{
    items: FleetActionResult[];
    total: number;
}>;
