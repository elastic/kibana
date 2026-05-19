import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { FleetActionsClientInterface, FleetActionRequest, FleetActionResult, BulkCreateResponse } from './types';
export declare class FleetActionsClient implements FleetActionsClientInterface {
    private esClient;
    private packageName;
    constructor(esClient: ElasticsearchClient, packageName: string);
    private _verifyAction;
    private _verifyResult;
    create(action: FleetActionRequest): Promise<FleetActionRequest>;
    bulkCreate(actions: FleetActionRequest[]): Promise<BulkCreateResponse>;
    getActionsByIds(ids: string[]): Promise<{
        items: FleetActionRequest[];
        total: number;
    }>;
    getActionsWithKuery(kuery: string): Promise<{
        items: FleetActionRequest[];
        total: number;
    }>;
    getResultsByIds(ids: string[]): Promise<{
        items: FleetActionResult[];
        total: number;
    }>;
    getResultsWithKuery(kuery: string): Promise<{
        items: FleetActionResult[];
        total: number;
    }>;
}
