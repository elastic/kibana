import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { EsNames } from './names';
import type { IClusterClientAdapter } from './cluster_client_adapter';
export declare const RETRY_DELAY = 2000;
export interface EsContext {
    readonly logger: Logger;
    readonly esNames: EsNames;
    readonly esAdapter: IClusterClientAdapter;
    initialize(): void;
    shutdown(): Promise<void>;
    waitTillReady(): Promise<boolean>;
    readonly initialized: boolean;
    readonly retryDelay: number;
    shouldSetExistingAssetsToHidden: boolean;
}
export interface EsError {
    readonly statusCode: number;
    readonly message: string;
}
export declare function createEsContext(params: EsContextCtorParams): EsContext;
export interface EsContextCtorParams {
    logger: Logger;
    indexNameRoot: string;
    shouldSetExistingAssetsToHidden: boolean;
    elasticsearchClientPromise: Promise<ElasticsearchClient>;
}
