import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';
export declare function runBackportPackagePolicyInputId(params: {
    abortController: AbortController;
    logger: Logger;
}): Promise<void>;
export declare function _runBackportPackagePolicyInputId(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, logger: Logger, abortController?: AbortController): Promise<void>;
